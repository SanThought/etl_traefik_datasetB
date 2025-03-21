const express = require('express');
const neo4j = require('neo4j-driver');
const { Pool } = require('pg');
const { Parser } = require('json2csv');
const fs = require('fs');

const app = express();
app.use(express.json());

// Read environment variables
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const POSTGRES_HOST = process.env.POSTGRES_HOST;
const POSTGRES_USER = process.env.POSTGRES_USER;
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
const POSTGRES_DB = process.env.POSTGRES_DB;

const neoDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
const pgPool = new Pool({
  host: POSTGRES_HOST,
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  database: POSTGRES_DB,
  port: 5432
});

// Health endpoint
app.get('/health', (req, res) => {
  res.status(200).send('API is healthy');
});

// 1. EXTRACT: GET /api/extract
app.get('/api/extract', async (req, res) => {
  const session = neoDriver.session();
  try {
    const result = await session.run('MATCH (l:Lenguaje) RETURN l');
    const data = result.records.map(r => r.get('l').properties);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// 2. TRANSFORM + 3. LOAD: POST /api/load
app.post('/api/load', async (req, res) => {
  const session = neoDriver.session();
  try {
    const neoResult = await session.run('MATCH (l:Lenguaje) RETURN l');
    const rawData = neoResult.records.map(r => r.get('l').properties);

    // Transform data
    const transformedData = rawData.map(item => {
      const id = item.id;
      // Format language name into camelCase (simple example)
      const nombre_formateado = item.nombre
        .split(' ')
        .map((word, idx) => idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');

      // Categorize popularidad
      let popularidad_categoria = '';
      if (item.popularidad < 30) popularidad_categoria = 'Poco Usado';
      else if (item.popularidad <= 70) popularidad_categoria = 'Moderado';
      else popularidad_categoria = 'Muy Popular';

      // Categorize velocidad
      let velocidad_categoria = '';
      if (item.velocidad < 40) velocidad_categoria = 'Lento';
      else if (item.velocidad <= 70) velocidad_categoria = 'Rápido';
      else velocidad_categoria = 'Muy Rápido';

      // Calculate efficiency
      const eficiencia = (item.popularidad + item.velocidad) / 2;

      // Set processing date
      const fecha_procesamiento = new Date().toISOString().split('T')[0];

      return {
        id,
        nombre_formateado,
        popularidad_categoria,
        velocidad_categoria,
        eficiencia,
        fecha_procesamiento
      };
    });

    // Insert into PostgreSQL
    const client = await pgPool.connect();
    try {
      for (const row of transformedData) {
        await client.query(
          `INSERT INTO etl_data (
             id, nombre_formateado, popularidad_categoria, 
             velocidad_categoria, eficiencia, fecha_procesamiento
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            row.id,
            row.nombre_formateado,
            row.popularidad_categoria,
            row.velocidad_categoria,
            row.eficiencia,
            row.fecha_procesamiento
          ]
        );
      }
    } finally {
      client.release();
    }
    res.json({ message: 'Data transformed and loaded into PostgreSQL', transformedData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// 4. EXPORT: GET /api/export
app.get('/api/export', async (req, res) => {
  const client = await pgPool.connect();
  try {
    const { rows } = await client.query('SELECT * FROM etl_data');
    if (!rows.length) {
      return res.status(404).json({ message: 'No data found in etl_data table' });
    }
    const fields = ['id', 'nombre_formateado', 'popularidad_categoria', 'velocidad_categoria', 'eficiencia', 'fecha_procesamiento'];
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);
    fs.writeFileSync('./output/recap.csv', csv);
    res.json({ message: 'CSV exported successfully', csv });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Start API
app.listen(3000, () => {
  console.log('ETL API listening on port 3000');
});

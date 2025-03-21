# 🐋 **Proyecto ETL con Docker, Traefik, Neo4j y PostgreSQL**

Autor: **Santiago Vargas**

---

## 📌 Introducción

Cómo fue propuesto el Miércoles, presento un proceso ETL (Extract, Transform, Load) que extrae datos desde una base de datos en **Neo4j**, los transforma, los carga en **PostgreSQL** y finalmente los exporta en formato CSV.

La solución emplea **Traefik** para simplificar y centralizar el enrutado entre servicios.

---

## 🚀 ¿Cómo ejecutar el proyecto?

Acá los pasos, y algunas recomendaciones:

---

## 🔧 **Paso 1:** Instalación de prerrequisitos (Docker)

> (De ya tener lo esencial: el elevar los provilegios de usuario ahorra el uso repetitivo de `sudo`)

**Docker & Docker Compose** (Ubuntu):

```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
newgrp docker
```

---

## 📂 **Paso 2:** Clonar el proyecto y navegar al directorio raíz

```bash
git clone https://github.com/SanThought/etl_traefik_datasetB.git
cd etl_traefik_datasetB
```

Los datos recomendados para el archivo `.env` :

```env
NEO4J_AUTH=neo4j/YourStrongPassword
NEO4J_PASSWORD=YourStrongPassword
POSTGRES_USER=postgres
POSTGRES_PASSWORD=pgPass123
POSTGRES_DB=etl_db
```

---

## 🐳 **Paso 3:** Construir y ejecutar los contenedores

Para construir las imágenes Docker y levantar los servicios:

```bash
docker-compose up --build
```

La primera ejecución puede tardar unos minutos.

---

## 📊 **Paso 4:** Cargar datos iniciales a Neo4j

- En un navegador, vamos la siguiente URL:

> 🌐 http://localhost:7474/browser/

- Usamos las credenciales definidas en `.env`:
  
  - **usuario:** `neo4j`
  - **contraseña:** `YourStrongPassword`
- En la barra superior del explorador Neo4j, ejecutamos el siguiente script:
  

```cypher
LOAD CSV WITH HEADERS FROM 'file:///dataset_b_lenguajes.csv' AS row
CREATE (:Lenguaje {
  id: row.id,
  nombre: row.nombre,
  popularidad: toInteger(row.popularidad),
  velocidad: toInteger(row.velocidad),
  paradigma: row.paradigma,
  año_creacion: toInteger(row.año_creacion)
});
```

Habrá un mensaje similar a:

✅ **"Added 1500 nodes"**

---

## 🌍 **Paso 5:** Comprobar enrutado con Traefik (requisito del parcial)

En el navegador (o con `curl`), verificamos estas URLs:

- Neo4j:

```bash
curl http://neo4j.localhost
```

Debe retornar información sobre Neo4j en formato JSON:
![curlneo](https://github.com/user-attachments/assets/f05e7c9a-0b9b-4436-97c5-27a79db57575)


- PostgreSQL:

```bash
curl http://postgresql.localhost
```

Debe retornar un mensaje HTML indicando que PostgreSQL está funcionando:
![curlpgres](https://github.com/user-attachments/assets/64d8c58e-6c2d-4326-a2e5-388e4dd53491)

> **_Recomendación: en ocasiones hay que ejecutar el comando un par de veces_**

---

## 🔄 **Paso 6:** Ejecutar el proceso ETL desde la API (ruta personalizada con Traefik)

### 👉 **Extraer datos desde Neo4j**

```bash
curl http://localhost/santiago-vargas/api/extract
```

Nos retornará JSON con datos:
![extract](https://github.com/user-attachments/assets/bb008e4f-3ea0-4b46-8305-12a970b7909b)


### 👉 **Cargar datos transformados en PostgreSQL**

```bash
curl -X POST http://localhost/santiago-vargas/api/load
```

Debe retornar un JSON confirmando los datos transformados:
![load](https://github.com/user-attachments/assets/f1137fe7-cf83-4ea0-8eab-ac6a2d6f5128)


### 👉 **Exportar datos en formato CSV**

```bash
curl http://localhost/santiago-vargas/api/export
```

Nos retornará los datos ya almacenados en PostgreSQL en formato CSV:
![export](https://github.com/user-attachments/assets/415f542d-810f-4b05-98c3-c967b831c1f3)


(Se puede ver más ordenado con `cat recap.csv` en el folder `output/` del proyecto.)

---

## 🧹 **Detener y limpiar**

```bash
docker-compose down
```

---

## 🗃️ **Estructura del Proyecto**

```
etl_traefik_datasetB/
├── api/                    # API NodeJS con endpoints ETL
├── neo4j_custom/           # Dockerfile Neo4j personalizado
├── postgres/               # Scripts SQL y comprobación HTTP PostgreSQL
├── neo4j/                  # Archivo CSV inicial a cargar en Neo4j
├── output/                 # Archivos CSV generados por el proceso ETL
├── docker-compose.yml      # Orquestación Docker Compose con Traefik
├── .env                    # Variables de entorno
└── README.md               # Este archivo
```

---

## ✅ **Nota**

> Para cualquier duda inmediata estaré probablemente en **[Discord](https://discordapp.com/users/santhought#4097)**

---

_Nota Técnica:_

## 🌐 URLs Ruteadas por Traefik

| 📌 Service | Traefik Host/Path | Destination Container | Exposed Port |
| --- | --- | --- | --- |
| Neo4j | `http://neo4j.localhost` | `neo4j_db` | 7474 |
| PostgreSQL | `http://postgresql.localhost` | `postgres_http_check` | 80  |
| ETL API | `http://localhost/santiago-vargas/...` | `api_etl` | 3000 |

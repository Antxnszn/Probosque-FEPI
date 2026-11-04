#!/bin/sh
set -eu

: "${PGHOST:=db}"
: "${PGUSER:=probosque}"
: "${PGDATABASE:=probosque_db}"
: "${FEPI_DB_PASSWORD:=fepi_dev_2026}"

psql_en() {
  destino="$1"
  shift
  psql -v ON_ERROR_STOP=1 -h "$PGHOST" -U "$PGUSER" -d "$destino" "$@"
}

asegurar() {
  rol="$1"
  nombre="$2"
  con_postgis="$3"

  psql_en "$PGDATABASE" -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${rol}') THEN CREATE ROLE ${rol} LOGIN PASSWORD '${FEPI_DB_PASSWORD}'; ELSE ALTER ROLE ${rol} WITH LOGIN PASSWORD '${FEPI_DB_PASSWORD}'; END IF; END \$\$;"

  existe=$(psql_en "$PGDATABASE" -tAc "SELECT 1 FROM pg_database WHERE datname = '${nombre}'" | tr -d '[:space:]')
  if [ "$existe" != "1" ]; then
    psql_en "$PGDATABASE" -c "CREATE DATABASE ${nombre} OWNER ${rol}"
  fi
  psql_en "$PGDATABASE" -c "ALTER DATABASE ${nombre} OWNER TO ${rol}"
  psql_en "$nombre" -c "REVOKE ALL ON DATABASE ${nombre} FROM PUBLIC"
  psql_en "$nombre" -c "GRANT CONNECT, TEMP ON DATABASE ${nombre} TO ${rol}"
  psql_en "$nombre" -c "GRANT ALL ON SCHEMA public TO ${rol}"

  if [ "$con_postgis" = "si" ]; then
    psql_en "$nombre" -c "CREATE EXTENSION IF NOT EXISTS postgis"
  fi
}

asegurar fepi_orquestador fepi_orquestador no
asegurar fepi_convocatorias fepi_convocatorias no
asegurar fepi_expediente_digital fepi_expediente_digital si
asegurar fepi_dictaminacion fepi_dictaminacion no
asegurar fepi_formalizacion_seguimiento fepi_formalizacion_seguimiento no
asegurar fepi_metricas_cierre fepi_metricas_cierre no

psql_en "$PGDATABASE" -c "ALTER DATABASE ${PGDATABASE} OWNER TO ${PGUSER}"
psql_en "$PGDATABASE" -c "REVOKE ALL ON DATABASE ${PGDATABASE} FROM PUBLIC"
psql_en "$PGDATABASE" -c "GRANT CONNECT ON DATABASE ${PGDATABASE} TO ${PGUSER}"
psql_en "$PGDATABASE" -c "REVOKE ALL ON DATABASE ${PGDATABASE} FROM fepi_orquestador, fepi_convocatorias, fepi_expediente_digital, fepi_dictaminacion, fepi_formalizacion_seguimiento, fepi_metricas_cierre"
psql_en "$PGDATABASE" -c "REVOKE ALL ON SCHEMA public FROM fepi_orquestador, fepi_convocatorias, fepi_expediente_digital, fepi_dictaminacion, fepi_formalizacion_seguimiento, fepi_metricas_cierre"

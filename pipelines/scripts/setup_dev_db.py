"""
Development database setup script for local PostgreSQL.
Creates user 'probosque' and database 'probosque_db' if they don't exist.
"""
import psycopg2

def setup():
    conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/postgres')
    conn.autocommit = True
    cur = conn.cursor()
    
    # Check/create user probosque
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname='probosque'")
    if not cur.fetchone():
        cur.execute("CREATE USER probosque WITH PASSWORD 'probosque_secret_2026' SUPERUSER;")
        print("Created user probosque")
    else:
        cur.execute("ALTER USER probosque WITH PASSWORD 'probosque_secret_2026';")
        print("Updated password for probosque")
        
    # Check/create database probosque_db
    cur.execute("SELECT 1 FROM pg_database WHERE datname='probosque_db'")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE probosque_db OWNER probosque;")
        print("Created database probosque_db")
    else:
        print("Database probosque_db already exists")
        
    conn.close()
    
    # Enable PostGIS in probosque_db
    conn_db = psycopg2.connect('postgresql://probosque:probosque_secret_2026@localhost:5432/probosque_db')
    conn_db.autocommit = True
    cur_db = conn_db.cursor()
    try:
        cur_db.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        print("PostGIS extension enabled")
    except Exception as e:
        print("PostGIS extension notice:", e)
    conn_db.close()

if __name__ == '__main__':
    setup()

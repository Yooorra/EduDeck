"""
=============================================================================
EduDeck - Student Authentication & SQLite Database Structure | DO NOT TOUCH PO MUNA TY
=============================================================================
This file is a starter snippet for the SQLite database.
It is separated from file_upload.py to keep the project clean and organized.

To test this database snippet on its own:
    python auth_db.py
"""

import sqlite3

DATABASE_NAME = 'students.db'


def init_db():
    """
    Creates the 'students.db' SQLite file and the 'users' table
    if they don't exist yet. Also inserts a default demo student account.
    """
    with sqlite3.connect(DATABASE_NAME) as conn:
        cursor = conn.cursor()
        
        # 1. Create Users Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        ''')
        
        # 2. Insert Default Demo Account if the table is empty
        cursor.execute('SELECT COUNT(*) FROM users')
        if cursor.fetchone()[0] == 0:
            cursor.execute('''
                INSERT INTO users (name, username, password)
                VALUES (?, ?, ?)
            ''', ('John Smith', '2024-0001', 'password123'))
            print("Database initialized: Demo student 'John Smith' (ID: 2024-0001) created.")
        
        conn.commit()


def register_user(name, username, password):
    """
    Registers a new student into the database.
    Returns: (True, message) if successful, (False, error_message) if failed.
    """
    try:
        with sqlite3.connect(DATABASE_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO users (name, username, password)
                VALUES (?, ?, ?)
            ''', (name.strip(), username.strip(), password.strip()))
            conn.commit()
            return True, "Account created successfully!"
    except sqlite3.IntegrityError:
        return False, "Student ID / Username already exists."
    except Exception as e:
        return False, f"Database error: {str(e)}"


def login_user(username, password):
    """
    Checks student credentials against the database.
    Returns: (True, student_dict) if valid, (False, error_message) if invalid.
    """
    try:
        with sqlite3.connect(DATABASE_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT name, username, password 
                FROM users 
                WHERE LOWER(username) = LOWER(?)
            ''', (username.strip(),))
            user = cursor.fetchone()

            if not user:
                return False, "Student ID not found."

            db_name, db_username, db_password = user
            if db_password != password.strip():
                return False, "Incorrect password."

            return True, {"name": db_name, "username": db_username}
    except Exception as e:
        return False, f"Database error: {str(e)}"


# =============================================================================
# Quick Test Block (Only runs if you execute 'python auth_db.py' directly)
# =============================================================================
if __name__ == '__main__':
    print("Setting up SQLite database...")
    init_db()
    
    # Test logging in with demo account
    success, result = login_user('2024-0001', 'password123')
    if success:
        print(f"Test Login Success! Welcome, {result['name']} ({result['username']})")
    else:
        print(f"Test Login Failed: {result}")

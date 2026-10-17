from flask import Flask, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename 
import os 
import subprocess # this is for running the ffmpeg command in the terminal -EARL
import sqlite3
from PyPDF2 import PdfMerger
from flask_cors import CORS

# init
app = Flask(__name__)
CORS(app) 


UPLOAD_FOLDER = 'Upload_backend'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


@app.route('/compress', methods=['POST'])
def upload_video():
    if 'video_file' not in request.files:
        return 'no video found', 400

    file = request.files['video_file']

    filename = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(input_path)
    
        
    #ffmpeg command to compress the video with good quality -EARL
    output_filename = 'compressed_' + os.path.splitext(filename)[0] + '.mp4'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)

    command = [
        'ffmpeg', '-y', '-i', input_path,
        '-c:v', 'libx264', '-crf', '28', '-preset', 'medium',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        output_path
    ]
    result = subprocess.run(command, capture_output=True, text=True)

    #If the ffmpeg failed, it will print the error and tell the browser that the compression failed - EARL
     if result.returncode != 0:
        print(result.stderr)
        return 'Compression failed', 500
    
    # ======================================================================

     return send_file(output_path, as_attachment=True, download_name='compressed_video.mp4')

# pdf merger
@app.route('/merge', methods=['POST'])
def merge_documents():
    files = request.files.getlist('doc_files')

    #check if at least two files were uploaded
    if len(files) < 2:
        return jsonify({'error': 'Please upload at least two documents to merge.'}), 400
    saved_files = []

    try:
        for file in files:
            if not file.filename:
                continue

            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            saved_files.append(file_path)

        #check if at least two valid files were saved
        if len(saved_files) < 2:
            return jsonify({'error': 'Please upload at least two valid documents to merge.'}), 400

        output_filename = 'merged_document.pdf'
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)

        merger = PdfMerger()
        for file_path in saved_files:
            merger.append(file_path)

        merger.write(output_path)
        merger.close()

        return jsonify({'download_url': f'/Upload_backend/{output_filename}'})

    except Exception as e:
        print(f"Error during document merging: {e}")
        return jsonify({'error': 'An error occurred while merging documents.'}), 500

#serve the merged document for download
@app.route('/Upload_backend/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    
#document converter
@app.route('/convert', methods=['POST'])
def convert_document():

    if 'doc_file' not in request.files:
        return jsonify({'error': 'No document file found.'}), 400
    file = request.files['doc_file']
    
    if not file.filename:
        return jsonify({'error': 'No filename provided.'}), 400
    filename = secure_filename(file.filename)

    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(input_path)

    try:
        subprocess.run(['libreoffice', '--headless', '--convert-to', 'pdf', input_path, '--outdir', app.config['UPLOAD_FOLDER']], check=True)
        output_filename = os.path.splitext(filename)[0] + '.pdf'

    except subprocess.CalledProcessError as e:
        print(f'Conversion failed: {e}')
        return jsonify({'error': 'Document conversion failed.'}), 500
    
    output_path = os.path.splitext(filename)[0] + '.pdf'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)

    if not os.path.exists(output_path):
        return jsonify({'error': 'Converted PDF not found.'}), 500

    return jsonify({'download_url': f'/Upload_backend/{output_filename}'})

# =========================================================================
# SQLITE DATABASE & AUTHENTICATION (Login & Register)
# =========================================================================
DB_NAME = 'students.db'

def init_db():
    """Initializes the local SQLite database for student accounts."""
    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        ''')
        # Insert default demo student account if empty
        cursor.execute('SELECT COUNT(*) FROM users')
        if cursor.fetchone()[0] == 0:
            cursor.execute('''
                INSERT INTO users (name, username, password)
                VALUES (?, ?, ?)
            ''', ('John Smith', '2024-0001', 'password123'))
        conn.commit()

# Run database setup on startup
init_db()

@app.after_request
def allow_cors(response):
    """Allows frontend JavaScript from file:// or other ports to connect without CORS errors."""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return response

@app.route('/api/register', methods=['POST', 'OPTIONS'])
def register_user():
    if request.method == 'OPTIONS':
        return ('', 204)

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not name or not username or not password:
        return jsonify({'message': 'All fields are required.'}), 400

    try:
        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO users (name, username, password) VALUES (?, ?, ?)',
                           (name, username, password))
            conn.commit()
            return jsonify({'message': 'Account created successfully!', 'username': username}), 201
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Student ID / Username is already registered.'}), 409
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login_user():
    if request.method == 'OPTIONS':
        return ('', 204)

    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'message': 'Please enter both student ID and password.'}), 400

    try:
        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT name, username, password FROM users WHERE LOWER(username) = LOWER(?)', (username,))
            user = cursor.fetchone()

            if not user:
                return jsonify({'message': 'Student ID not found. Please register first.'}), 404

            db_name, db_username, db_password = user
            if db_password != password:
                return jsonify({'message': 'Incorrect password.'}), 401

            return jsonify({
                'message': 'Login successful!',
                'name': db_name,
                'username': db_username
            }), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)

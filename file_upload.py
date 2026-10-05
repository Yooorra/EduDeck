from flask import Flask, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename 
import os 
import subprocess #this is for running the ffmpeg command in the terminal -EARL
from PyPDF2 import PdfMerger

# TODO TEAMMATE A: Import CORS from flask_cors here so the browser doesn't block us!

# EARL NISHKY INSTALL FLASK AND OTHER THINGS BEFORE UPDATING BACKEND
# into your terminal type this, pip install -r requirements.txt
app = Flask(__name__)
# TODO TEAMMATE A: Initialize CORS here (e.g. CORS(app))


UPLOAD_FOLDER = 'Upload_backend'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# TODO TEAMMATE A: Add an os.makedirs check here to create the UPLOAD_FOLDER if it doesn't exist yet!


@app.route('/compress', methods=['POST'])
def upload_video():
    if 'video_file' not in request.files:
        return 'no video found', 400

    file = request.files['video_file']

    filename = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(input_path)
    
    # =========================================================================
    # TODO TEAMMATE B: THE COMPRESSOR!
    # Right now, we just save the original file. 
        # Write Python code here to use FFmpeg to compress the video at `input_path` 
        # and save it to a new file (e.g., `compressed_video.mp4`).
        # Make sure to update the download_url below to point to your NEW compressed file!
        # 
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

    return send_file(output_path, as_attachment=True, download_name='compressed_video.mp4') #I changed this to send the compressed video back to the user instead of just returning a download URL - EARL

#document merger 
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

if __name__ == '__main__':
    app.run(debug=True)
from flask import Flask, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename 
import os 
import subprocess # this is for running the ffmpeg command in the terminal -EARL
from PyPDF2 import PdfMerger
from flask_cors import CORS

# init
app = Flask(__name__)
CORS(app) 


# TODO: 'Upload_backend' is a short path, so it depends on which folder you run python from.
# If it's run from another folder, files get saved in one place and looked for in another (404 error).
# Use the full path instead: os.path.join(os.path.dirname(__file__), 'Upload_backend')
UPLOAD_FOLDER = 'Upload_backend'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


# =========================================================================
# TODO EARL & NISHKY: VIDEO COMPRESSOR
# 1. Only works on Earl's PC side. FFmpeg has to be installed on the PC that runs this,
#    if not, it crashes. Add a try/except for when FFmpeg is missing.
# 2. It does compress, but the file only appears inside the project's folder, not in the
#    browser's downloading tab. Make it sync with the loading screen that was added:
#    loading shows while compressing, then the compressed video gets downloaded into
#    the folder the user picked.
# 3. The page blinks a few times while it compresses. This is probably VS Code Live Server
#    refreshing the page because new files keep appearing inside the project folder.
#    Save the files outside the project folder (like a temp folder) and it should stop.
# =========================================================================
@app.route('/compress', methods=['POST'])
def upload_video():
    if 'video_file' not in request.files:
        return 'no video found', 400

    file = request.files['video_file']

    # TODO: if the file has no name, this becomes empty and breaks. Check it first (like /convert does).
    filename = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    # TODO: the original upload and the compressed file stay in Upload_backend forever.
    # Delete them after sending, or the folder fills up with big videos.
    file.save(input_path)
    
        
    # =========================================================================
    # TODO EARL & NISHKY: CUSTOM SAVE LOCATION FROM FRONTEND
    # The front-end sends 'dest_folder', but it's only the folder NAME (like 'nuod/'),
    # not the full path (browsers don't share the full path). So Python can't tell where it really is.
    # If you do os.makedirs(dest_folder), it just makes a new 'nuod' folder inside the project!
    # Easy ways to fix it:
    #   1. Let the front-end save the file into the picked folder after Python sends it back.
    #   2. Or skip the custom folder and let the browser download it (the Download button already does).
    # =========================================================================

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

    # If the ffmpeg failed, it will print the error and tell the browser that the compression failed - EARL
    if result.returncode != 0:
        print(result.stderr)
        return 'Compression failed', 500
    
    # ======================================================================

    return send_file(output_path, as_attachment=True, download_name='compressed_video.mp4')

# =========================================================================
# TODO TEAMMATES: PDF / DOCUMENT MERGER
# Make it so it works for doc and pdf files.
# Right now the converting and the merger don't really work yet.
# The Merge button on the website isn't connected to this either (see dashboard_logic.js).
# =========================================================================
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

        # TODO: the file name is always 'merged_document.pdf'
        # so a new merge will replace the old one. Give it a different name each time!
        output_filename = 'merged_document.pdf'
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)

        # TODO: this only works with PDF files!
        # If the user uploads a DOC or PPT, it will crash here.
        # Convert them to PDF first or tell the user it's PDF only.
        merger = PdfMerger()
        for file_path in saved_files:
            merger.append(file_path)

        merger.write(output_path)
        merger.close()

        # TODO: the website can't find this link because it's missing the server address.
        # Add http://127.0.0.1:5000 in front of it.
        return jsonify({'download_url': f'/Upload_backend/{output_filename}'})

    except Exception as e:
        print(f"Error during document merging: {e}")
        return jsonify({'error': 'An error occurred while merging documents.'}), 500

#serve the merged document for download
@app.route('/Upload_backend/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    
#document converter
# TODO: this only makes PDFs, but the website says 'To .pdf, .doc, or .ppt'.
# Either add the other formats or change the website text to PDF only.
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
        # TODO: this needs LibreOffice installed on the computer, and most don't have it.
        # It will say 'file not found' and crash. Install it, or use another way to convert.
        # Also add a catch below for when LibreOffice is missing.
        subprocess.run(['libreoffice', '--headless', '--convert-to', 'pdf', input_path, '--outdir', app.config['UPLOAD_FOLDER']], check=True)
        output_filename = os.path.splitext(filename)[0] + '.pdf'

    except subprocess.CalledProcessError as e:
        print(f'Conversion failed: {e}')
        return jsonify({'error': 'Document conversion failed.'}), 500
    
    # TODO: output_path is set twice. The first line gets replaced right away by the second.
    # Delete the first line.
    output_path = os.path.splitext(filename)[0] + '.pdf'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)

    if not os.path.exists(output_path):
        return jsonify({'error': 'Converted PDF not found.'}), 500

    return jsonify({'download_url': f'/Upload_backend/{output_filename}'})

if __name__ == '__main__':
    app.run(debug=True)

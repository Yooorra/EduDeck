from flask import Flask, request, jsonify, send_file, send_from_directory, after_this_request
from werkzeug.utils import secure_filename 
from PyPDF2 import PdfMerger, PdfReader
from flask_cors import CORS
from pathlib import Path
import os 
import subprocess # this is for running the ffmpeg command in the terminal -EARL
import uuid
import shutil
import tempfile


# init
app = Flask(__name__)
CORS(app) 

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'Upload_backend') 
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


# =========================================================================
# TODO: VIDEO COMPRESSOR
# 1. Only works on Earl's PC side. FFmpeg has to be installed on the PC that runs this,
#    if not, it crashes. Add a try/except for when FFmpeg is missing.
# 2. It does compress, but the file only appears inside the project's folder, not in the    
#    browser's downloading tab. Make it sync with the loading screen that was added:
#    loading shows while compressing, then the compressed video gets downloaded into
#    the folder the user picked.
# 3. The page blinks a few times while it compresses. This is probably VS Code Live Server
#    refreshing the page because new files keep appearing inside the project folder.
#    Save the files outside the project folder (like a temp folder) and it should stop.

# this is the temporary folder, so the live server does not refresh the page -EARL
TEMP_FOLDER = os.path.join(tempfile.gettempdir(), 'edudeck_temp')
os.makedirs(TEMP_FOLDER, exist_ok=True)


def _cleanup(*paths):
    for p in paths:
        try:
            if os.path.exists(p):
                os.remove(p)
        except Exception as e:
            print(f"Error deleting temporary file: {e}")
            
# =========================================================================
@app.route('/compress', methods=['POST'])
def upload_video():
    if 'video_file' not in request.files:
        return 'no video found', 400

    file = request.files['video_file']
    if file.filename == '':
        return 'no selected file', 400

 # FFmpeg must be installed on the PC running this server- EARL
    if shutil.which('ffmpeg') is None:
        return jsonify({'error': 'FFmpeg is not installed on the server PC.'}), 500

    job_id = uuid.uuid4().hex
    filename = secure_filename(file.filename)
    output_filename = 'compressed_' + os.path.splitext(filename)[0] + '.mp4'
    input_path = os.path.join(TEMP_FOLDER, f'{job_id}_{filename}')
    output_path = os.path.join(TEMP_FOLDER, f'{job_id}_{output_filename}')
    file.save(input_path)

    # =========================================================================
    # TODO: CUSTOM SAVE LOCATION FROM FRONTEND
    # The front-end sends 'dest_folder', but it's only the folder NAME (like 'nuod/'),
    # not the full path (browsers don't share the full path). So Python can't tell where it really is.
    # If you do os.makedirs(dest_folder), it just makes a new 'nuod' folder inside the project!
    # Easy ways to fix it:
    #   1. Let the front-end save the file into the picked folder after Python sends it back.
    #   2. Or skip the custom folder and let the browser download it (the Download button already does).
    # =========================================================================

    #ffmpeg command to compress the video with good quality -EARL
    command = [
           'ffmpeg', '-y', '-i', input_path,
           '-vf', "scale='min(1280,iw)':-2",
           '-c:v', 'libx264', '-crf', '30', '-preset', 'medium',
           '-c:a', 'aac', '-b:a', '96k',
           '-movflags', '+faststart',
           output_path
       ]
    try:
        result = subprocess.run(command, capture_output=True, text=True)
    except FileNotFoundError:
        _cleanup(input_path, output_path)
        return jsonify({'error': 'FFmpeg could not be found.'}), 500

    if result.returncode != 0:
        print('FFmpeg failed:', result.stderr)
        _cleanup(input_path, output_path)
        return jsonify({'error': 'Compression failed.'}), 500

    # Never gonna return a bigger file than the original-EARL
    send_path = output_path
    if os.path.getsize(output_path) >= os.path.getsize(input_path):
        send_path = input_path

    response = send_file(send_path, as_attachment=True,
                         download_name=output_filename, mimetype='video/mp4')
    # Delete temporary files after the file has been fully sent-EARL
    response.call_on_close(lambda: _cleanup(input_path, output_path))
    return response

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

    #create a temporary directory to store the uploaded files
    temp_dir = tempfile.mkdtemp(prefix='merge_')
    merger = PdfMerger()

    try:
        saved_files = []

        for file in files:
            if not file.filename:
                continue

            filename = secure_filename(file.filename)

            if not filename:
                return jsonify({'error': 'Invalid filename.'}), 400

            #only pdfs allowed
            if os.path.splitext(filename)[1].lower() != '.pdf':
                return jsonify({'error': 'Only PDF files are allowed.'}), 400

            #create unique filename
            stored_filename = (f'{uuid.uuid4()}_{filename}')
            file_path = os.path.join(temp_dir, stored_filename)
            file.save(file_path)

            if os.path.getsize(file_path) == 0:
                return jsonify({'error': f'{filename} is empty.'}), 400

            try: 
                with open(file_path, 'rb') as pdf_stream:
                    reader = PdfReader(pdf_stream, strict=False)

                    if reader.is_encrypted:
                        return jsonify({'error' : (f'{filename} is encrypted')}), 400

                    if len(reader.pages) == 0:
                        return jsonify({'error' : (f'{filename} has no pages')}), 400

            except Exception:
                return jsonify({'error' : (f'{filename} is not a readable pdf.')}), 400

            saved_files.append(file_path)

        #check if at least two valid files were saved
        if len(saved_files) < 2:
            return jsonify({'error': 'Please upload at least two valid PDFs to merge'}), 400

        for file_path in saved_files:
            merger.append(file_path)

        #create unique filename(merged pdf)
        output_path = os.path.join(temp_dir, f'merged_pdf{uuid.uuid4().hex}.pdf')
        merger.write(output_path)
        merger.close()

        if (not os.path.exists(output_path)) or (os.path.getsize(output_path) == 0):
            return jsonify({'error': 'Merged PDF not created.'}), 500

        #send merged pdf directly to javascript isntead of saving it in Upload_backend
        response = send_file(output_path, mimetype='application/pdf', as_attachment=True, download_name='merged_document.pdf')
        response.call_on_close(lambda path=temp_dir: shutil.rmtree(path, ignore_errors=True))
        temp_dir = None
        return response

    except Exception:
        app.logger.exception('PDF merging failed.')
        return jsonify({'error': 'PDF merging failed.'}), 500

    finally:
        merger.close()
        if temp_dir is not None:
            shutil.rmtree(temp_dir, ignore_errors=True)

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

    if not filename:
        return jsonify({'error': 'Invalid filename.'}), 400

    allowed_extensions = ['.doc', '.docx', '.ppt', '.pptx', '.odt', '.odp']
    if os.path.splitext(filename)[1].lower() not in allowed_extensions:
        return jsonify({'error': 'Unsupported file type.'}), 400

    temp_dir = tempfile.mkdtemp(prefix='convert_')

    try:
        stored_filename = f'{uuid.uuid4()}_{filename}'
        input_path = os.path.join(temp_dir, stored_filename)
        file.save(input_path)

        if os.path.getsize(input_path) == 0:
            return jsonify({'error': f'{filename} is empty.'}), 400
        profile_path = os.path.join(temp_dir, 'lo_profile')

        soffice = shutil.which('soffice') or shutil.which('libreoffice')

        if not soffice:
            for path in [
                r'C:\Program Files\LibreOffice\program\soffice.exe',
                r'C:\Program Files (x86)\LibreOffice\program\soffice.exe'
            ]:
                if os.path.isfile(path):
                    soffice = path
                    break

        if not soffice:
            app.logger.error('LibreOffice not found.')
            return jsonify({'error': 'LibreOffice is not installed or not found.'}), 500

        try:
            subprocess.run([soffice,'--headless',f'-env:UserInstallation={Path(profile_path).as_uri()}','--convert-to', 'pdf','--outdir', temp_dir, input_path
                ],check=True, capture_output=True, text=True, timeout=120)

        except subprocess.TimeoutExpired:
            return jsonify({'error': 'Document conversion timed out.'}), 504

        except subprocess.CalledProcessError:
            app.logger.exception('Document conversion failed.')
            return jsonify({'error': 'Document conversion failed.'}), 500

        output_filename = os.path.splitext(stored_filename)[0] + '.pdf'
        output_path = os.path.join(temp_dir, output_filename)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            return jsonify({'error': 'Converted PDF not created.'}), 500
        download_filename = os.path.splitext(filename)[0] + '.pdf'

        response = send_file(output_path, mimetype='application/pdf', as_attachment=True, download_name=download_filename)
        response.call_on_close(lambda path=temp_dir: shutil.rmtree(path, ignore_errors=True))
        temp_dir = None
        return response

    except Exception:
        app.logger.exception('Document conversion failed.')
        return jsonify({'error': 'Document conversion failed.'}), 500

    finally:
        if temp_dir is not None:
            shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == '__main__':
    app.run(debug=True)

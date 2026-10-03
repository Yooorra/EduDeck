from flask import Flask, request, jsonify, send_file #Added send_file to send the compressed video back to the user -EARL
from werkzeug.utils import secure_filename 
import os 
import subprocess #this is for running the ffmpeg command in the terminal -EARL

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

<<<<<<< HEAD
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
=======
    # =========================================================================
    # TODO NISHKY:
    # Okay lang dun sa job on the Javascript blob download. 8/10. 
    # Because your JS changes is now expecting a raw video file instead of text/JSON, 
    # you need to change this return statement. 
    # Instead of `jsonify(...)`, use Flask's `send_file()` to return the .mp4 file nalang
    # e.g., return send_file(input_path, as_attachment=True)
    # =========================================================================
    return jsonify({'download_url': f'/Upload_backend/{filename}'})
>>>>>>> d3c670e65c310dbf6b4e19bead2cdc35a27b6e69

# =========================================================================
# TODO TEAMMATE A: SERVE THE DOWNLOAD!
# Create a new @app.route('/Upload_backend/<filename>') here.
# It should use Flask's `send_from_directory` to actually send the file back 
# so the user can download it when they click the link!
# =========================================================================

# =========================================================================
# TODO TEAMMATE C (or B): DOCUMENT CONVERTER
# Create a new @app.route('/convert', methods=['POST']) here.
# 1. Receive the document file (e.g., .doc or .ppt) from the frontend via request.files
# 2. Use a library like `python-docx2pdf` or an API to convert it to a PDF.
# 3. Save it to UPLOAD_FOLDER and return the new download_url as JSON!
# =========================================================================

# =========================================================================
# TODO TEAMMATE D (or B): DOCUMENT MERGER
# Create a new @app.route('/merge', methods=['POST']) here.
# 1. Receive multiple files (e.g., request.files.getlist('doc_files'))
# 2. Use a library like `PyPDF2` to merge them into one single PDF.
# 3. Save the merged file and return the new download_url as JSON!
# =========================================================================

if __name__ == '__main__':
    app.run(debug=True)
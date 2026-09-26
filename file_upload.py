from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename 
import os 

app = Flask(__name__)


UPLOAD_FOLDER = 'Upload_backend'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


@app.route('/compress', methods=['POST'])
def upload_video():
    if 'video_file' not in request.files:
        return 'no video found', 400

    file = request.files['video_file']

    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({'download_url': f'/Upload_backend/{filename}'}), 
if __name__ == '__main__':
    app.run(debug=True)
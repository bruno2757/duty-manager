from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Data file path
DATA_FILE = '/data/schedule.json'
BACKUP_DIR = '/data/backups'

# Ensure directories exist
os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)


def create_backup():
    """Create timestamped backup before saving"""
    if os.path.exists(DATA_FILE):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(BACKUP_DIR, f'schedule_backup_{timestamp}.json')
        try:
            with open(DATA_FILE, 'r') as src:
                with open(backup_file, 'w') as dst:
                    dst.write(src.read())
            print(f"✓ Backup created: {backup_file}")
        except Exception as e:
            print(f"✗ Backup failed: {e}")


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'data_file_exists': os.path.exists(DATA_FILE)
    }), 200


@app.route('/api/save', methods=['POST'])
def save_data():
    """
    Save complete application data to file.
    Expects JSON body with all app state.
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Create backup of existing data
        create_backup()

        # Save new data
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"✓ Data saved successfully at {datetime.now()}")

        return jsonify({
            'success': True,
            'message': 'Data saved successfully',
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        print(f"✗ Error saving data: {e}")
        return jsonify({
            'error': str(e),
            'message': 'Failed to save data'
        }), 500


@app.route('/api/load', methods=['GET'])
def load_data():
    """
    Load complete application data from file.
    Returns empty object if file doesn't exist.
    """
    try:
        if not os.path.exists(DATA_FILE):
            print("ℹ No data file exists, returning empty state")
            return jsonify({}), 200

        with open(DATA_FILE, 'r') as f:
            data = json.load(f)

        print(f"✓ Data loaded successfully at {datetime.now()}")

        return jsonify(data), 200

    except Exception as e:
        print(f"✗ Error loading data: {e}")
        return jsonify({
            'error': str(e),
            'message': 'Failed to load data'
        }), 500


@app.route('/api/export', methods=['GET'])
def export_data():
    """
    Export data for manual download (same as load, but different endpoint for clarity)
    """
    return load_data()


if __name__ == '__main__':
    print("=" * 50)
    print("Duty Manager Backend Server")
    print("=" * 50)
    print(f"Data file: {DATA_FILE}")
    print(f"Backup directory: {BACKUP_DIR}")
    print(f"File exists: {os.path.exists(DATA_FILE)}")
    print("=" * 50)

    # Run on all interfaces, port 5001 (5000 taken by Frigate)
    app.run(host='0.0.0.0', port=5001, debug=True)

const { Client } = require('pg');
const { parse } = require('multipart-parser');

exports.handler = async (event) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Neon DB connection
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Neon ke liye required
    }
  });

  try {
    await client.connect();

    // Create table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_data TEXT NOT NULL,
        file_name VARCHAR(255),
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Parse multipart form data
    const contentType = event.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    
    if (!boundary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid content type' })
      };
    }

    // Parse multipart data
    const parts = parse(Buffer.from(event.body, 'base64'), boundary);
    
    let title = '';
    let description = '';
    let imageFile = null;

    // Extract form fields
    for (const part of parts) {
      if (part.name === 'title') {
        title = part.data.toString();
      } else if (part.name === 'description') {
        description = part.data.toString();
      } else if (part.name === 'image') {
        imageFile = {
          data: part.data,
          filename: part.filename,
          type: part.type,
        };
      }
    }

    if (!title || !imageFile) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title and image are required' })
      };
    }

    // Convert image to base64 for storage
    const imageBase64 = imageFile.data.toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${imageBase64}`;

    // Insert into Neon DB
    const result = await client.query(
      `INSERT INTO images (title, description, image_data, file_name, file_size, mime_type) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, title, uploaded_at`,
      [title, description, dataUrl, imageFile.filename, imageFile.data.length, imageFile.type]
    );

    await client.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Image uploaded successfully',
        image: result.rows[0]
      }),
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
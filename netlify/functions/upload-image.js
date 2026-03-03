// netlify/functions/upload-image.js
const { Client } = require('pg');
const Busboy = require('busboy');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
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

    // Parse using busboy
    const busboy = Busboy({ headers: event.headers });
    
    let formData = {
      title: '',
      description: '',
      image: null
    };

    await new Promise((resolve, reject) => {
      busboy.on('field', (fieldname, val) => {
        formData[fieldname] = val;
      });

      busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks = [];
        
        file.on('data', (chunk) => chunks.push(chunk));
        
        file.on('end', () => {
          formData.image = {
            data: Buffer.concat(chunks),
            filename: filename,
            type: mimeType
          };
          resolve();
        });
      });

      busboy.on('error', (err) => reject(err));
      
      // Write the body to busboy
      busboy.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
      busboy.end();
    });

    const { title, description, image } = formData;

    if (!title || !image) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title and image required' })
      };
    }

    // Convert to base64
    const imageBase64 = image.data.toString('base64');
    const dataUrl = `data:${image.type};base64,${imageBase64}`;

    // Insert into DB
    const result = await client.query(
      `INSERT INTO images (title, description, image_data, file_name, file_size, mime_type) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, title, uploaded_at`,
      [title, description || '', dataUrl, image.filename, image.data.length, image.type]
    );

    await client.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Upload successful',
        image: result.rows[0]
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
const express = require('express');
const pg = require('pg');
const morgan = require('morgan');

const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/the_acme_icecream_db');
const app = express();

// Middleware
app.use(express.json());
app.use(morgan('dev'));

const port = process.env.PORT || 3000;

const init = async () => {
    await client.connect();
    console.log('Connected to database');
    try {
        // Create flavors table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS flavors (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                is_favorite BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now()
            );
        `);
        console.log('Flavors table created');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

init();

// Routes

// Get all flavors
app.get('/api/flavors', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM flavors ORDER BY created_at DESC';
        const response = await client.query(SQL);
        res.json(response.rows);
    } catch (error) {
        next(error);
    }
});

// Get a single flavor by id
app.get('/api/flavors/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id); // Parse id as integer
        if (isNaN(id)) {
            res.status(400).send('Invalid id');
            return;
        }
        const SQL = 'SELECT * FROM flavors WHERE id = $1';
        const response = await client.query(SQL, [id]);
        if (response.rows.length === 0) {
            res.status(404).send('Flavor not found');
        } else {
            res.json(response.rows[0]);
        }
    } catch (error) {
        next(error);
    }
});

// Create a new flavor
app.post('/api/flavors', async (req, res, next) => {
    try {
        const { name, is_favorite } = req.body;
        const SQL = 'INSERT INTO flavors(name, is_favorite) VALUES($1, $2) RETURNING *';
        const response = await client.query(SQL, [name, is_favorite]);
        res.status(201).json(response.rows[0]);
    } catch (error) {
        next(error);
    }
});

// Delete a flavor by id
app.delete('/api/flavors/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const SQL = 'DELETE FROM flavors WHERE id = $1';
        await client.query(SQL, [id]);
        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
});

// Update a flavor by id
app.put('/api/flavors/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, is_favorite } = req.body;
        const SQL = 'UPDATE flavors SET name = $1, is_favorite = $2, updated_at = now() WHERE id = $3 RETURNING *';
        const response = await client.query(SQL, [name, is_favorite, id]);
        if (response.rows.length === 0) {
            res.status(404).send('Flavor not found');
        } else {
            res.json(response.rows[0]);
        }
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Something went wrong!');
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
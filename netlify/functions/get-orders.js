// Import necessary modules
const { createClient } = require('@supabase/supabase-js'); // Supabase client library
const { stringify } = require('csv-stringify'); // CSV stringify library

// Initialize Supabase client
// Get credentials from Netlify environment variables
// IMPORTANT: These must be set in Netlify site settings -> Build & Deploy -> Environment
const SUPABASE_URL = process.env.SUPABASE_URL; // Your Supabase Project URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Your Supabase Service Role Key (secret!)

// Use the SERVICE_ROLE_KEY for backend functions to bypass RLS and access all data.
// This key must NEVER be exposed on the frontend. It's secure when used within Netlify Functions.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
    // 1. Authenticate the request using the token sent from admin-dashboard.html
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Unauthorized attempt: Missing or invalid Authorization header.');
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized: No token provided.' }),
        };
    }

    const token = authHeader.split(' ')[1];
    // For our simplified example, we're just checking for the expected hardcoded token.
    // In a real application, you'd verify a real JWT token's signature and expiration here.
    if (token !== "secure-login-token-12345") { // This must match the token set in login.js
        console.warn('Unauthorized attempt: Invalid token.');
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized: Invalid token.' }),
        };
    }

    // 2. Fetch data from Supabase
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*') // Select all columns from the orders table
            .order('order_date', { ascending: false }); // Order by date, newest first

        if (error) {
            console.error('Error fetching orders from Supabase:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error fetching orders.', details: error.message }),
            };
        }

        // 3. Handle no orders found
        if (!orders || orders.length === 0) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="all_orders.csv"',
                },
                body: 'Order ID,Customer Name,Customer Email,Customer Phone,Customer Address,Total Amount,Payment Method,Transaction ID,Screenshot URL,Product Details (JSON),Order Date\nNo orders found.\n', // CSV header + message
            };
        }

        // 4. Define CSV columns and their headers, including new fields
        const columns = [
            { key: 'id', header: 'Order ID' },
            { key: 'customer_name', header: 'Customer Name' },
            { key: 'customer_email', header: 'Customer Email' },
            { key: 'customer_phno', header: 'Customer Phone' },
            { key: 'customer_address', header: 'Customer Address' },
            { key: 'total_amount', header: 'Total Amount' },
            { key: 'payment_method', header: 'Payment Method' }, // New column
            { key: 'transaction_id', header: 'Transaction ID' }, // New column
            { key: 'transaction_screenshot_url', header: 'Screenshot URL' }, // New column
            { key: 'product_details', header: 'Product Details (JSON)' }, // Product details will be stringified JSON
            { key: 'order_date', header: 'Order Date' }
        ];

        // 5. Prepare data: ensure JSON fields are stringified and dates are formatted
        const processedOrders = orders.map(order => ({
            ...order,
            // Convert product_details object/array to a string for CSV
            product_details: JSON.stringify(order.product_details) || '[]', 
            // Ensure transaction_id and transaction_screenshot_url are strings, default to empty if null
            transaction_id: order.transaction_id || '',
            transaction_screenshot_url: order.transaction_screenshot_url || '',
            // Format order date for readability
            order_date: new Date(order.order_date).toLocaleString() 
        }));

        // 6. Generate CSV string
        return new Promise((resolve, reject) => {
            stringify(processedOrders, { header: true, columns: columns }, (err, output) => {
                if (err) {
                    console.error('Error generating CSV:', err);
                    return reject({
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Error generating CSV.', details: err.message }),
                    });
                }

                resolve({
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': 'attachment; filename="all_orders.csv"',
                    },
                    body: output,
                });
            });
        });

    } catch (unexpectedError) {
        console.error('Unhandled error in get-orders function:', unexpectedError);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An unexpected server error occurred.', details: unexpectedError.message }),
        };
    }
};

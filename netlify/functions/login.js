exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    // Get your secure credentials from Netlify environment variables
    // THESE MUST BE SET IN NETLIFY SITE SETTINGS -> BUILD & DEPLOY -> ENVIRONMENT
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    // Basic validation (replace with more robust authentication in production)
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
        console.error("ADMIN_USERNAME or ADMIN_PASSWORD environment variables are not set!");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Server configuration error. Admin credentials not set." }),
        };
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // For simplicity, we'll use a hardcoded token.
      // In a real application, you'd generate a secure JWT (JSON Web Token) here.
      // This token is checked by the get-orders.js function.
      const token = "secure-login-token-12345"; 
      
      return {
        statusCode: 200,
        body: JSON.stringify({ token: token, message: "Login successful!" }),
      };
    } else {
      return {
        statusCode: 401, // Unauthorized
        body: JSON.stringify({ message: "Invalid username or password." }),
      };
    }
  } catch (error) {
    console.error('Error parsing login request body:', error);
    return {
      statusCode: 400, // Bad Request
      body: JSON.stringify({ message: 'Invalid request body.' }),
    };
  }
};

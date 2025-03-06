# Snack Up

A modern snack ordering and delivery platform for companies to manage their office snack inventory and employee preferences.

## Features

- **User Roles**: Support for employees, company admins, and super admins
- **Snack Management**: Add, edit, and track snack inventory
- **Preference System**: Employees can set their snack preferences and daily quantities
- **Order Management**: Track and manage snack orders and deliveries
- **Analytics**: View consumption patterns and popular snacks
- **Dietary Information**: Support for dietary preferences (vegetarian, vegan, dairy-free)

## AI Features

### Smart Recommendations
- **Personalized Snack Suggestions**: Uses OpenAI to analyze user preferences and dietary restrictions to recommend suitable snacks
- **Consumption Pattern Analysis**: AI-driven insights into snack popularity and ordering trends
- **Automated Store Detection**: Intelligent detection of store names from product URLs

### Inventory Optimization
- **Smart Reordering**: AI-powered predictions for optimal reorder timing and quantities
- **Waste Reduction**: Machine learning algorithms to minimize food waste through precise ordering
- **Cost Optimization**: Automated suggestions for bulk purchases based on consumption patterns

### Dietary Analysis
- **Ingredient Classification**: Automatic categorization of snacks into dietary categories (vegan, vegetarian, dairy-free)
- **Allergen Detection**: AI-assisted identification of potential allergens in snack ingredients
- **Nutritional Insights**: Smart analysis of nutritional content and healthiness scores

## Technologies

### Frontend
- **React.js** (v18) - Core frontend framework
- **React Router** (v6) - Client-side routing
- **Chart.js** & **React-Chartjs-2** - Data visualization
- **CSS3** - Custom styling with CSS variables for theming

### Backend
- **Node.js** & **Express.js** - Server framework
- **Supabase** - Database and authentication
- **Multer** - File upload handling
- **Serverless Functions** - Netlify serverless deployment

### Development & Deployment
- **Create React App** - Development and build tooling
- **Netlify** - Hosting and deployment
- **dotenv** - Environment variable management
- **Concurrently** - Running multiple development servers

## Prerequisites

Before you begin, ensure you have installed:
- Node.js (v18 or higher)
- npm (v9 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/snack-up.git
cd snack-up
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=5000
```

## Development

### Starting the Development Server

Run the following command to start both the frontend and backend servers:

```bash
npm run dev
```

This will start:
- Frontend server on http://localhost:3000
- Backend server on http://localhost:5000

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run server` - Runs only the backend server
- `npm run dev` - Runs both frontend and backend servers

## Testing

Run the test suite with:

```bash
npm test
```

## Building for Production

1. Build the application:
```bash
npm run build
```

2. The build artifacts will be stored in the `build` folder.

## Deployment

The application is configured for deployment on Netlify. The `netlify.toml` file contains the necessary deployment configurations.

## API Documentation

The backend API is organized into the following routes:

- `/api/auth` - Authentication endpoints
- `/api/snacks` - Snack management
- `/api/preferences` - User preferences
- `/api/orders` - Order management
- `/api/companies` - Company management
- `/api/inventory` - Inventory tracking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@snackup.com or open an issue in the repository.

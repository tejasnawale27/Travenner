const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const multer = require('multer');
const requireAdmin = require('./middleware/adminAuth');
const adminRoutes = require('./routes/adminRoutes');

// Models
const User = require('./models/userSchema');
const Booking = require('./models/bookingSchema');
const Package = require('./models/packageSchema');
const Admin = require('./models/adminSchema');

mongoose.connect('mongodb://127.0.0.1:27017/cppmainproject', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
});

// Session configuration
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb://127.0.0.1:27017/cppmainproject',
        ttl: 24 * 60 * 60 // Session TTL (1 day)
    }),
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(express.urlencoded({ extended: true }));

// Add cors and JSON parsing middleware
app.use(cors());
app.use(express.json());

// Add this middleware function after your session setup
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// Add this after your session middleware
app.use(async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            if (user) {
                res.locals.user = user;
            } else {
                // Clear invalid session
                req.session.destroy();
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            // Clear invalid session
            req.session.destroy();
        }
    }
    next();
});

// Add the chatbot API route
const apiKey = 'AIzaSyBULLK-JF__vqm5lWxjSPDQxSD3G8l_Jqk';
const geminiAPI = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
const weatherApiKey = '7985e46a4685ce8018393671f582501f';
const weatherAPI = (city) => `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric`;

// Add this after your other middleware setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "kirveapurva3806@gmail.com",
        pass: "cwio sbcn keog mhya"
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify email configuration
transporter.verify(function(error, success) {
    if (error) {
        console.error('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('error', { 
        error: 'Something went wrong! Please try again.' 
    });
});

app.get('/', requireLogin, async (req, res) => {
    try {
        const loginSuccess = req.session.loginSuccess;
        // Clear the success message after showing it
        delete req.session.loginSuccess;
        
        res.render('index', { 
            user: req.session.user,
            success: loginSuccess ? 'Logged in successfully!' : null
        });
    } catch (error) {
        console.error('Error in root route:', error);
        res.redirect('/login');
    }
});

app.get('/register', (req, res) => {
    res.render('user/registration', { error: null });
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Basic validation
        if (!name || !email || !password) {
            return res.render('user/registration', {
                error: 'All fields are required'
            });
        }
        
        // Validate password length
        if (password.length < 6) {
            return res.render('user/registration', {
                error: 'Password must be at least 6 characters long'
            });
        }
        
        // Validate name format
        const nameRegex = /^[A-Za-z]{2,}(?:\s[A-Za-z]{2,})*$/;
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!nameRegex.test(name)) {
            return res.render('user/registration', {
                error: 'Please enter a valid name (minimum 2 letters per word, only letters and spaces allowed)'
            });
        }

        if (!emailRegex.test(email)) {
            return res.render('user/registration', {
                error: 'Please enter a valid email address'
            });
        }
        
        // Check if email already exists
        const existingUser = await User.findOne({ 
            email: email.toLowerCase().trim() 
        });
        
        if (existingUser) {
            return res.render('user/registration', { 
                error: 'Email already exists' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'user'
        });
        
        await user.save();
        res.render('user/login', { 
            success: 'Registration successful! Please login.' 
        });
    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed. Please try again.';
        if (error.code === 11000) {
            errorMessage = 'Email already exists';
        }
        res.render('user/registration', { 
            error: errorMessage
        });
    }
});

app.get('/login', (req, res) => {
    res.render('user/login');
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('user/login', { error: 'Invalid email or password' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.render('user/login', { error: 'Invalid email or password' });
        }
        
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        await req.session.save();
        
        // Set success message in session
        req.session.loginSuccess = true;
        
        if (user.role === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('user/login', { error: 'An error occurred' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;
    console.log("User Message:", userMessage);

    // Enhanced travel-focused prompt
    let prompt = `You are a knowledgeable travel assistant. Provide helpful travel information for this request: "${userMessage}". 
    If the query is about a specific destination, include:
    - Best time to visit
    - Popular attractions
    - Local cuisine
    - Travel tips
    - Cultural considerations
    - Estimated costs
    Keep the response concise and well-organized. Use clear new lines to separate different points.`;

    try {
        console.log("Sending AI prompt...");
        const response = await axios.post(geminiAPI, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        let aiReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "I apologize, I couldn't process your travel query at the moment.";

        // Enhanced weather checking with more travel context
        const weatherKeywords = /\b(weather|climate|temperature|forecast|rain|sunny|cold|hot|warm)\b/i;
        const isWeatherQuery = weatherKeywords.test(userMessage);
        let weatherInfo = '';

        if (isWeatherQuery) {
            // Enhanced city extraction
            const cityMatch = userMessage.match(/\b(?:in|at|for|of|about)\s+([\p{L}\s]+?)(?:\s+(?:weather|climate|temperature|today|now|forecast|like)|$)/iu);
            const city = cityMatch ? cityMatch[1].trim() : null;

            if (city) {
                try {
                    console.log("Fetching weather for:", city);
                    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric`;
                    const weatherResponse = await axios.get(weatherUrl);
                    console.log("Weather API Response:", weatherResponse.data);

                    if (weatherResponse.data && weatherResponse.data.main) {
                        const weatherData = weatherResponse.data;
                        const temperature = Math.round(weatherData.main.temp);
                        const feelsLike = Math.round(weatherData.main.feels_like);
                        const humidity = weatherData.main.humidity;
                        const description = weatherData.weather[0].description;
                        const windSpeed = Math.round(weatherData.wind.speed);

                        weatherInfo = `\n\n🌤️ Current Weather in ${city}:
🌡️ Temperature: ${temperature}°C
🌡️ Feels like: ${feelsLike}°C
💧 Humidity: ${humidity}%
🌥️ Condition: ${description}
💨 Wind Speed: ${windSpeed} m/s

Travel Tip: ${getWeatherTravelTip(temperature, description)}`;
                        
                        console.log("Formatted Weather Info:", weatherInfo);
                    } else {
                        weatherInfo = "\n\n⚠️ Weather data is not available for this location at the moment.";
                    }
                } catch (weatherError) {
                    console.error("Weather API Error:", weatherError.message);
                    weatherInfo = "\n\n⚠️ Couldn't retrieve weather information for this location. Please check the city name and try again.";
                }
            } else {
                weatherInfo = "\n\n⚠️ Please specify a city name for weather information.";
            }
        }

        res.json({ reply: aiReply + weatherInfo });

    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ reply: "I apologize, but I'm having trouble processing your travel query at the moment. Please try again later." });
    }
});

// Helper function to provide weather-based travel tips
function getWeatherTravelTip(temperature, condition) {
    const conditions = condition.toLowerCase();
    
    if (temperature > 30) {
        return "Consider planning outdoor activities for early morning or evening to avoid the heat. Stay hydrated and carry sunscreen.";
    } else if (temperature < 10) {
        return "Pack warm clothing and plan for indoor activities. Check indoor attractions in the area.";
    } else if (conditions.includes('rain') || conditions.includes('shower')) {
        return "Pack an umbrella and waterproof gear. Many indoor attractions might be less crowded on rainy days.";
    } else if (conditions.includes('clear') || conditions.includes('sunny')) {
        return "Great weather for outdoor sightseeing! Don't forget sun protection and stay hydrated.";
    } else if (conditions.includes('cloud')) {
        return "Perfect weather for exploring the city. Not too hot, not too cold.";
    } else {
        return "Check local forecasts for any weather-related travel advisories.";
    }
}

app.get('/chat', (req, res) => {
    res.render('chatbot');
});

app.get('/feedback', (req, res) => {
    res.render('feedback');
});

app.post('/submit-feedback', (req, res) => {
    const { email, feedback, rating } = req.body;

    if (!email || !feedback || !rating) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const mailOptions = {
        from: email,
        to: "kirveapurva3806@gmail.com",
        subject: "New Feedback Submission",
        text: `Email: ${email}\nRating: ${rating} Stars\nFeedback: ${feedback}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ message: "Error sending email" });
        }
        res.json({ message: "Feedback submitted successfully!" });
    });
});

app.get('/booking', (req, res) => {
    res.render('booking');
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads/packages';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Serve uploaded files
app.use('/uploads', express.static('public/uploads'));

// Package routes
app.post('/api/packages', upload.array('images', 5), async (req, res) => {
    try {
        const imagePaths = req.files.map(file => '/uploads/packages/' + file.filename);
        const packageData = {
            packageName: req.body.packageName,
            location: req.body.location,
            price: parseFloat(req.body.price),
            overview: req.body.overview,
            images: imagePaths,
            departureCity: req.body.departureCity,
            arrivalCity: req.body.arrivalCity,
            tripType: req.body.tripType,
            itinerary: req.body.itinerary,
            guide: req.body.guide
        };
        const newPackage = new Package(packageData);
        await newPackage.save();
        res.status(201).json(newPackage);
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ error: 'Error creating package' });
    }
});

app.get('/api/packages', async (req, res) => {
    try {
        let query = {};
        if (req.query.location) {
            // Case-insensitive search for location
            query.$or = [
                { location: new RegExp(req.query.location, 'i') },
                { departureCity: new RegExp(req.query.location, 'i') },
                { arrivalCity: new RegExp(req.query.location, 'i') }
            ];
        }
        const packages = await Package.find(query);
        res.json(packages);
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ error: 'Error fetching packages' });
    }
});

app.put('/api/packages/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        const updatedPackage = await Package.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedPackage);
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ error: 'Error updating package' });
    }
});

app.delete('/api/packages/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        await Package.findByIdAndDelete(req.params.id);
        res.json({ message: 'Package deleted successfully' });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({ error: 'Error deleting package' });
    }
});

// Add admin routes
app.use('/api', adminRoutes);

// Update the admin panel route
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.session.adminId);
        console.log('Admin access attempt by:', admin.email);
        res.render('admin/admin-panel');
    } catch (error) {
        console.error('Admin panel access error:', error);
        res.redirect('/login');
    }
});

// Add route for package form
app.get('/packages/add', async (req, res) => {
    try {
        res.render('packages/add');
    } catch (error) {
        console.error('Error accessing package form:', error);
        res.redirect('/');
    }
});

app.get('/packages/manage', requireLogin, requireAdmin, async (req, res) => {
    try {
        const packages = await Package.find();
        res.render('admin/admin-panel', { 
            activeSection: 'packageSection',
            packages: packages 
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.redirect('/');
    }
});

app.get('/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            authenticated: true, 
            user: res.locals.user 
        });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/weather', async (req, res) => {
    try {
        const city = req.query.city;
        if (!city) {
            return res.status(400).json({ error: 'City parameter is required' });
        }

        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric`;
        const response = await axios.get(weatherUrl);
        
        const weatherData = {
            temp: Math.round(response.data.main.temp),
            description: response.data.weather[0].description,
            humidity: response.data.main.humidity
        };
        
        res.json(weatherData);
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({ error: 'Unable to fetch weather data' });
    }
});

// Add the Gemini API endpoint
app.post('/gemini', async (req, res) => {
    try {
        const { prompt } = req.body;
        const response = await axios.post(geminiAPI, {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        });

        let aiResponse = '';
        if (response.data.candidates && response.data.candidates[0].content) {
            aiResponse = response.data.candidates[0].content.parts[0].text;
        } else {
            aiResponse = "I'm sorry, I couldn't generate a response at the moment.";
        }

        res.json({ response: aiResponse });
    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ 
            error: 'Failed to get response from AI',
            details: error.message 
        });
    }
});

// Add route for headfoot page
app.get('/headfoot', (req, res) => {
    res.render('headfoot');
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/trips', (req, res) => {
    res.render('trips');
});

app.get('/blog', (req, res) => {
    res.render('blog');
});

app.get('/contact-us', (req, res) => {
    res.render('contact-us');
});

app.get('/guide', (req, res) => {
    res.render('guide');
});

app.get('/destination', (req, res) => {
    res.render('destination');
});

app.get('/index1', (req, res) => {
    const packageName = req.query.name;
    if (!packageName) {
        return res.redirect('/trips');
    }
    
    // Read and parse the JSON file
    const packagesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'views', 'data.json'), 'utf8'));
    
    // Find the package with matching title
    const packageDetails = packagesData.find(pkg => pkg.title === packageName);
    
    if (!packageDetails) {
        return res.redirect('/trips');
    }
    
    res.render('index1', { packageDetails });
});

app.post('/submit-form', async (req, res) => {
    try {
        const bookingData = req.body;
        
        // Validate required fields
        if (!bookingData.email || !bookingData.name) {
            return res.status(400).json({ 
                message: 'Missing required booking information'
            });
        }
        
        // Create a new PDF document
        const doc = new PDFDocument();
        const pdfPath = path.join(__dirname, 'temp', `booking-${Date.now()}.pdf`);
        
        // Ensure temp directory exists
        if (!fs.existsSync(path.join(__dirname, 'temp'))) {
            fs.mkdirSync(path.join(__dirname, 'temp'));
        }
        
        // Pipe PDF to a file
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);
        
        // Add content to PDF
        doc.fontSize(20).text('Booking Confirmation', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12);
        
        // Add booking details
        doc.text(`Booking Reference: #${Date.now()}`);
        doc.moveDown();
        doc.text(`Name: ${bookingData.name}`);
        doc.text(`Email: ${bookingData.email}`);
        doc.text(`Phone: ${bookingData.phone}`);
        doc.text(`Visit Date: ${bookingData.visitDate}`);
        doc.text(`Group Size: ${bookingData.groupSize}`);
        doc.text(`Tour Interest: ${bookingData.tourInterest}`);
        doc.text(`Contact Methods: ${bookingData.contactMethods.join(', ')}`);
        doc.text(`Best Time to Call: ${bookingData.callTime}`);
        if (bookingData.additionalInfo) {
            doc.moveDown();
            doc.text('Additional Information:');
            doc.text(bookingData.additionalInfo);
        }
        
        // Finalize PDF
        doc.end();
        
        // Wait for PDF to be created
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        
        // Create email with PDF attachment
        const mailOptions = {
            from: {
                name: 'Travenner Tours',
                address: 'kirveapurva3806@gmail.com'
            },
            to: bookingData.email,
            subject: 'Your Travenner Booking Confirmation',
            text: `Dear ${bookingData.name},\n\nThank you for booking with Travenner! Please find your booking confirmation attached.\n\nBest regards,\nTravenner Team`,
            attachments: [{
                filename: 'booking-confirmation.pdf',
                path: pdfPath,
                contentType: 'application/pdf'
            }]
        };
        
        // Send email
        await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Email sending error:', error);
                    reject(error);
                } else {
                    console.log('Email sent successfully:', info.messageId);
                    resolve(info);
                }
            });
        });
        
        // Create new booking in database
        const booking = new Booking({
            name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone,
            visitDate: bookingData.visitDate,
            groupSize: bookingData.groupSize,
            tourInterest: bookingData.tourInterest,
            contactMethods: bookingData.contactMethods,
            callTime: bookingData.callTime,
            additionalInfo: bookingData.additionalInfo,
            referralSource: bookingData.referralSource,
            status: 'pending'
        });
        
        await booking.save();
        
        // Clean up PDF file
        fs.unlinkSync(pdfPath);
        
        res.status(200).json({ 
            message: 'Booking confirmed! Check your email for the confirmation PDF.'
        });
        
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ 
            message: 'An error occurred while processing your booking. Please try again.'
        });
    }
});

app.listen(8888, () => {
    console.log('Server is running on port 8888');
});
require('dotenv/config');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);
const mongoose = require('mongoose');
const path = require('path');
const {User, validateUser} = require('./models/user');

app.use(express.static('frontend/build'));

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
});

io.on('connection', (socket) => {
    // add new user
    socket.on('newUser', (data) => {
        const {error} = validateUser(data);
        
        if (error) {
            error.details.forEach(err => {
                err[err.context.key] = err.message;
                delete err.message;
                delete err.path;
                delete err.type;
                delete err.context;
            });
            const [name, email, phone] = error.details;
            const Error = {...name, ...email, ...phone};
            socket.emit('newUserErr', Error);
        } else {
            const user = new User(data);
            user.save((err, result) => {
                if (err) {
                    socket.emit('newUserErr', {newUserErr: 'User added failed!'});
                } else {
                    getData();
                    socket.emit('newUserMsg', {message: 'User added successfully!'});
                }
            });
        }
    });

    // get all user
   const getData = async () => {
    try {
        if (await User.count() > 0) {
            const users = await User.find()
                .sort({'createdAt': -1});
            socket.emit('users', users);
        } else {
            socket.emit('noData', {noData: 'No data available!'});
        }
    } catch (error) {
        socket.emit('loadErr', {loadErr: 'Failed to load user list!'});
    }
   }
   getData();
});

const DB = process.env.MONGODB_URL;

mongoose.set('strictQuery', true);

mongoose.connect(DB)
    .then(() => console.log('Connected to MongoDB database successfully...'))
    .catch(err => console.log('MongoDB database connection failed!'));

const port = process.env.PORT || 5000;

server.listen(port, () => {
    console.log(`Listening on port number ${port}...`);
});
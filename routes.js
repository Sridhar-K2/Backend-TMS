require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');
const model = require('./model/userSchema');

const router = express.Router();

// A middleware function to verify user's authorization with tokens before logging them into the tasks page
const verifyUser = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).send('Token not provided');
    }
    jwt.verify(token, process.env.MY_SECRET, (err, decode) => {
        if (err) {
            return res.status(403).send('Invalid token');
        }
        req.body.email = decode.email;
        next();
    });
};

// Routes to create a new user
router.post('/signup', async (req, res) => {
    console.log("signup Components");
    const newUser = new model({
        userName: req.body.userName,
        email: req.body.email,
        password: req.body.password
    });

    try {
        await newUser.save();
        res.send(newUser);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Login route and user's authentication with password and email check and authentication with web token
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const token = jwt.sign({ email }, process.env.MY_SECRET, { expiresIn: '1d' });
    try {
        const user = await model.findOne({ email: email });
        if (user.password === password) {
            res.send({ user, token });
        } else {
            res.status(401).send('Incorrect password');
        }
    } catch (error) {
        res.status(401).send({ error: error.message });
    }
});

// Route to get user and user's projects after authorization is confirmed
router.get('/tasks', verifyUser, async (req, res) => {
    try {
        const userDetails = await model.findOne({ email: req.query.email });
        res.send(userDetails);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Route to create and add new project/tasks to the user's list
router.patch('/tasks', verifyUser, async (req, res) => {
    try {
        const email = req.body.email;
        const update = req.body;
        const option = { new: true };

        const result = await model.findOneAndUpdate(
            { email }, { '$push': { tasks: update } }, option
        );
        res.send(result);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Route to edit user's tasks based on title, description, and deadline
router.patch('/tasks/edit', verifyUser, async (req, res) => {
    try {
        const email = req.body.email;
        const update = req.body;
        const option = { new: true };

        const result = await model.findOneAndUpdate(
            { email, 'tasks._id': update._id }, {
                '$set': {
                    'tasks.$.title': update.title,
                    'tasks.$.description': update.description,
                    'tasks.$.deadline': update.deadline,
                    'tasks.$.isDone': update.isDone
                }
            }, option
        );
        res.send(result);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Route to update user's status to true or false
router.patch('/tasks/status', verifyUser, async (req, res) => {
    try {
        const email = req.body.email;
        const update = req.body;
        const option = { new: true };

        const result = await model.findOneAndUpdate(
            { email, 'tasks._id': update._id }, { '$set': { 'tasks.$.isDone': update.isDone } }, option
        );
        res.send(result);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Route to delete selected project/tasks from the user's list
router.patch('/tasks/delete', verifyUser, async (req, res) => {
    try {
        const email = req.body.email;
        const { title, description, deadline, isDone, _id } = req.body;
        const option = { new: true };

        const result = await model.findOneAndUpdate(
            { email }, { '$pull': { tasks: { title, description, deadline, isDone, _id } } }, option
        );
        const response = {
            result: result,
            isDelete: true
        };
        res.send(response);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Logging out a user
router.get('/logout', (req, res) => {
    res.send('Logged out successfully');
});

module.exports = router;

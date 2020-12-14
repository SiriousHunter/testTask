'use strict';
var express = require('express');
var router = express.Router();
var { body, validationResult } = require('express-validator');
var jwt = require('jsonwebtoken');
var passport = require("passport");
var crypto = require('crypto')
var db = require('../lib/db')
const util = require('util');
var fs = require('fs');

var readFile = util.promisify(fs.readFile)
var writeFile = util.promisify(fs.writeFile)
var unlink = util.promisify(fs.unlink) 
var jwtOptions = {}
jwtOptions.secretOrKey = 'TestKey';

var errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
    // Build your resulting errors however you want! String, object, whatever - it works!
    return {
        field: param,
        message: msg
    }
};

//Update current user
router.put('/users/me', [

    passport.authenticate('jwt', { session: false }),
    body('phone').isLength({ min: 1 }).optional(),
    body('name').isLength({ min: 1 }).optional(),
    body('email').isEmail().optional(),
    body('current_password').isLength({ min: 5 }).optional(),
    body('new_password').if(body('current_password').exists()).isLength({ min: 5 })

], async (req, res) => {
     const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors.array());
    }

    try {

        let body = {
            phone: (req.body.phone) ? req.body.phone : null,
            name: (req.body.name) ? req.body.name : null,
            email: (req.body.email) ? req.body.email : null,
            password: (req.body.new_password) ? req.body.new_password : null,
        }
        if (body.password) {
            let user = await db.getUser(null, null, req.user.id)

            if (req.body.current_password !== user.password) throw 'Wrong password'
        }
        
        

        var user = await db.updateUser(req.user.id, body)

    } catch (err) {
        
        return res.status(500).json({ ERROR: err })
    }

    res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email,  })

});

//Get current user
router.get('/users/me', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        var user = await db.getUser(null,null,req.user.id)

    } catch (err) {
        throw err
        return res.status(500).json({ ERROR: err })
    }

    res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email, })

});

//Get user by ID
router.get('/users/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {

    var id = req.params.id;

    try {
        var user = await db.getUser(null, null, id)

    } catch (err) {
        throw err
        return res.status(500).json({ ERROR: err })
    }

    res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email, })

});

//search user
router.get('/users/', passport.authenticate('jwt', { session: false }), async (req, res) => {

    var search = {
        email: (req.query.email) ? req.query.email : undefined,
        name: (req.query.name) ? req.query.name : undefined
    }


    try {
        var user = await db.searchUser(search)

    } catch (err) {
        throw err
        return res.status(500).json({ ERROR: err })
    }

    res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email, })

});

//register
router.post('/users', [
    body('phone').isLength({ min: 1 }),
    body('name').isLength({ min: 1 }),
    body('email').isEmail(),
    body('password').isLength({ min: 5 })
], async (req, res) => {

        const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
        return res.status(400).json( errors.array());
    }

    let body = {
        name: req.body.name,
        pass: req.body.password,
        phone: req.body.phone,
        email: req.body.email
    }

    try {
        let user = await db.createUser(body)

        var payload = { name: user.name, id: user.id };
        var token = jwt.sign(payload, jwtOptions.secretOrKey, { expiresIn: '30d' });
    } catch (err) {
        console.log(err)
        return res.status(500).json({ ERROR: "SERVER_ERROR" })
    }

        res.json({token: token });

});

//login
router.post('/sessionsBody', [
    body('email').isEmail().withMessage('incorrect Email'),
    body('password').isLength({ min: 5 })
], async (req, res) => {

    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {


        return res.status(400).json(errors.array());
    }

    try {
        let user = await db.getUser(req.body.email, req.body.password)

        var payload = { name: user.name, id: user.id };
        var token = jwt.sign(payload, jwtOptions.secretOrKey, { expiresIn: '30d' });
    } catch (err) {
        console.log(err)
        return res.status(500).json({ ERROR: "SERVER_ERROR" })
    }

    res.json({ token: token });

});


//create Item
router.post('/items', [
        passport.authenticate('jwt', { session: false }),
        body('title').exists(),
        body('price').exists()

    ], async (req, res) => {


    try {
        var item = await db.createItem({ title: req.body.title, price: req.body.price, user:req.user.id })

    } catch (err) {

        return res.status(500).json({ ERROR: err })
    }

    res.json(item)
});

//update item
router.put('/items/:id', [

    passport.authenticate('jwt', { session: false }),
    body('title').isLength({ min: 1 }).optional(),
    body('price').isLength({ min: 1 }).optional(),

], async (req, res) => {
    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors.array());
    }

    try {
        var itemId = req.params.id

        let body = {
            title: (req.body.title) ? req.body.title : null,
            price: (req.body.price) ? req.body.price : null,
        }

        if (body.title || body.price) {
            var item = await db.updateItem(itemId,body)


        } else {
            throw 'NO DATA ENTERED'
        }


    } catch (err) {
        throw err
        return res.status(500).json({ ERROR: err })
    }

    res.json(item)

});

//get item by id
router.get('/items/:id', async (req, res) => {

    var id = req.params.id;

    try {
        var item = await db.getItem(id)

    } catch (err) {
        throw err
        return res.status(500).json({ ERROR: err })
    }

    res.json(item)

});

//delete item
router.delete('/items/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {

    var id = req.params.id;

    try {
        var item = await db.deleteItem(id)

    } catch (err) {
        throw err
        return res.status(500).json({ ERROR: err })
    }

    res.sendStatus(200)

});

//upload image
router.post('/items/:id/image', passport.authenticate('jwt', { session: false }), async (req, res) => {
    var id = req.params.id;
    var file = req.file
    
    var tmp_path = req.file.path;
    var target_path = 'uploads/' + req.file.originalname;


    fs.readFile(tmp_path, function (err, data) {
        fs.writeFile(target_path, data, function (err) {
            var body = {
                image: target_path
            }


        })
    })



    try {
        var data = await readFile(tmp_path)
        await writeFile(target_path,data)

        var body = {
            image: target_path
        }
        var item = await db.updateItem(id, body)

    } catch (err) {
        throw err
        return res.status(500).json({ ERROR: err })
    }

    res.sendStatus(200)

});

//delete item
router.delete('/items/:id/image', passport.authenticate('jwt', { session: false }), async (req, res) => {

    var id = req.params.id;

    try {
        var body = {
            image: null
        }
        var item = await db.getItem(id)
        await unlink(item.image)

        await db.updateItem(id, body)

    } catch (err) {
        throw err
        return res.status(500).json({ ERROR: err })
    }

    res.sendStatus(200)

});


module.exports = router;
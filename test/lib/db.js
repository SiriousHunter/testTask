'use strict';

const mysql = require('mysql');
const util = require('util');
const { connect } = require('../routes/api');
var nconf = require('./config')

var db_config = nconf.get('database');

var pool = mysql.createPool(db_config);

const query = util.promisify(pool.query).bind(pool);

var createUser = async function (body) {

    let connection = await query("INSERT INTO `users`(`name`,`password`,`email`, `phone`) VALUES (?,?,?,?)", [body.name, body.pass, body.email, body.phone])

    let id = connection.insertId
    return body.name,id
}

var getUser    = async function (email, pass, id) {

    if (email && pass) {
        var user = await query("SELECT * FROM `users` WHERE `email` = ? AND `password` = ?", [email, pass])
    } else if (+id) {
        var user = await query("SELECT * FROM `users` WHERE `id` = ? ", [id])
    } else {
        return
    }

    if (user.length <= 0) throw "Wrong email or password"

    return user[0]
}

var updateUser = async function (userId, body) {

    var set = ''

    for (let i in body) {
       
        set += (body[i])? `\`${i}\`=  '${body[i]}',` : ''
    }
    set = set.slice(0, -1);

    var user = await query(`UPDATE \`users\` SET ${set} WHERE \`id\` = '${userId}'`);
    

    return getUser(null, null, userId)
}

var searchUser = async function (search) {

    if (search.name && search.email) {
        var user = await query("SELECT * FROM `users` WHERE `name` = ? AND `email` = ?", [search.name, search.email])
    } else {
        let str = (search.email) ? `\`email\` = '${search.email}' ` : `\`name\` = '${search.name}' `

        var user = await query(`SELECT * FROM \`users\` WHERE ${str} `)
    } 

    if (user.length <= 0) throw "Wrong email or password"

    return user[0]
}

var createItem = async function (body) {
    var ts = Math.floor(Date.now() / 1000)

    let connection = await query("INSERT INTO `items`(`title`,`price`, `user`, `created_at`) VALUES (?,?,?,?)", [body.title, body.price, body.user, ts])

    let userData = await getUser(null,null,body.user)
    let id = connection.insertId
    return {
        id: id,
        created_at: ts,
        title: body.title,
        price: body.price,
        image: null,
        user_id: body.user,
        user: {
            id: userData.id,
            phone: userData.phone,
            name: userData.name,
            email: userData.email
        }


    }
}

var updateItem = async function (id, body) {

    var set = ''

    for (let i in body) {
        console.log(body[i])
        set += (body[i]) ? `\`${i}\`=  '${body[i]}',` : ''
        if (body.image == null) set +=  `\`image\` = null ,`
    }
    set = set.slice(0, -1);
    
    console.log(`UPDATE \`items\` SET ${set} WHERE \`id\` = '${id}'`)

    await query(`UPDATE \`items\` SET ${set} WHERE \`id\` = '${id}'`);


    return getItem(id)
}

var getItem    = async function (id) {

    
    var item = await query("SELECT * FROM `items` WHERE `id` = ?", [id])
    
    if (item.length <= 0) throw "Item not found"
    item = item[0]
    var userData = await getUser(null, null, item.user)


    

    return {
        id: item.id,
        created_at: item.created_at,
        title: item.title,
        price: item.price,
        image: item.image,
        user_id: item.user,
        user: {
            id: userData.id,
            phone: userData.phone,
            name: userData.name,
            email: userData.email
        }


    }
}

var deleteItem = async function (id) {
    await query("DELETE FROM `items` WHERE `id`=?", [id])

}


module.exports = {
    createUser,
    getUser,
    updateUser,
    searchUser,
    createItem,
    updateItem,
    getItem,
    deleteItem
}
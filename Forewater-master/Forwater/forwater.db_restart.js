let {
    init,
    createIndex,
    deleteIndex,
    getAllIndices
} = require('../../../searchsdk/index.js');

let initializeSbDB = () => {
    return init()
        .then(res => {
            return getAllIndices();
        })
        .then(res => {
            let availableIndices = JSON.parse(res.body).indexes;

            if (availableIndices.indexOf('dk.db') === -1) {
                return { message : 'Creating For water index now.' };
            } else {
                return deleteIndex({ indexName : 'dk.db' });
            }
        })
        .then(res => {
            res.message && console.log(res.message);
            return createIndex({ indexName : 'dk.db'});
        });
}

module.exports = {
    initializeSbDB
}
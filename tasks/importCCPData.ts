export default {
    name: 'import:ccpdata',
    description: 'Import data into the database',
    run({ args }) {
        console.log('Importing data into the database');
        return { result: 'Success' };
    }
};

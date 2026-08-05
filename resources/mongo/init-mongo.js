db = db.getSiblingDB('agent');
db.createUser({
  user: 'miaoyu',
  pwd: 'miaoyu_change_me',
  roles: [{ role: 'readWrite', db: 'agent' }]
});

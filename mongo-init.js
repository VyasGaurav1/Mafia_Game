// MongoDB initialization script
// Creates the mafia database with initial collections and indexes

// Switch to mafia database
db = db.getSiblingDB('mafia');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['oderId', 'username'],
      properties: {
        oderId: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        username: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        socketId: {
          bsonType: 'string',
          description: 'must be a string'
        },
        currentRoom: {
          bsonType: 'string',
          description: 'must be a string'
        },
        isOnline: {
          bsonType: 'bool',
          description: 'must be a boolean'
        },
        stats: {
          bsonType: 'object',
          properties: {
            gamesPlayed: { bsonType: 'int' },
            gamesWon: { bsonType: 'int' },
            mafiaGames: { bsonType: 'int' },
            villagerGames: { bsonType: 'int' }
          }
        }
      }
    }
  }
});

db.createCollection('rooms', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['roomCode', 'hostId'],
      properties: {
        roomCode: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        hostId: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        status: {
          enum: ['WAITING', 'IN_PROGRESS', 'FINISHED'],
          description: 'must be a valid room status'
        }
      }
    }
  }
});

db.createCollection('gamestates');
db.createCollection('actionlogs');
db.createCollection('votelogs');

// Create indexes
db.users.createIndex({ oderId: 1 }, { unique: true });
db.users.createIndex({ socketId: 1 });
db.users.createIndex({ username: 1 });

db.rooms.createIndex({ roomCode: 1 }, { unique: true });
db.rooms.createIndex({ hostId: 1 });
db.rooms.createIndex({ status: 1 });
db.rooms.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // TTL: 24 hours

db.gamestates.createIndex({ roomCode: 1 }, { unique: true });
db.gamestates.createIndex({ phase: 1 });

db.actionlogs.createIndex({ gameId: 1 });
db.actionlogs.createIndex({ phase: 1 });
db.actionlogs.createIndex({ timestamp: 1 });

db.votelogs.createIndex({ gameId: 1 });
db.votelogs.createIndex({ day: 1 });

print('MongoDB initialization complete!');

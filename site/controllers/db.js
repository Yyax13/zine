import 'dotenv/config.js'
import { Sequelize, DataTypes } from 'sequelize';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const DATABASE_URL = process.env.DATABASE_URL

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: "postgres",
    logging: false,
    ssl: false,
    pool: {
        max: 10,
        min: 0,
        idle: 10000,
        acquire: 30000

    },

});

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        unique: true,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false

    },
    userName: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false

    },
    pass: {
        type: DataTypes.TEXT,
        unique: false,
        allowNull: false
    
    },
    worm: {
        type: DataTypes.BOOLEAN,
        allowNull: false

    }
}, {
    timestamps: true,
    schema: process.env.PG_SCHEMA,
    tableName: 'User'

})

const Article = sequelize.define('Article', {
    slug: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,

    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,

    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,

    },
    short_description: {
        type: DataTypes.STRING,
        allowNull: true,

    },
    author: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: {
                tableName: 'User',
                schema: process.env.PG_SCHEMA
            },
            key: 'id'
        }
    }
}, {
    timestamps: true,
    schema: process.env.PG_SCHEMA,
    tableName: 'Article'

});

Article.belongsTo(User, {
    foreignKey: { name: 'author', allowNull: false },
    targetKey: 'id',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'

})

User.hasMany(Article, {
    foreignKey: { name: 'author', allowNull: false },
    sourceKey: 'id',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'

})

// Trick model for short Twitter-like posts
const Trick = sequelize.define('Trick', {
    slug: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,

    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,

    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,

    },
    short_description: {
        type: DataTypes.STRING,
        allowNull: true,

    },
    author: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: {
                tableName: 'User',
                schema: process.env.PG_SCHEMA
            },
            key: 'id'
        }
    }
}, {
    timestamps: true,
    schema: process.env.PG_SCHEMA,
    tableName: 'Trick'

});

Trick.belongsTo(User, {
    foreignKey: { name: 'author', allowNull: false },
    targetKey: 'id',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'

})

User.hasMany(Trick, {
    foreignKey: { name: 'author', allowNull: false },
    sourceKey: 'id',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'

})

// Reflection model: plain text reflections (no markdown), multilingual support
const Reflection = sequelize.define('Reflection', {
    slug: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    language: {
        type: DataTypes.STRING,
        allowNull: true
    },
    author: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: {
                tableName: 'User',
                schema: process.env.PG_SCHEMA
            },
            key: 'id'
        }
    }
}, {
    timestamps: true,
    schema: process.env.PG_SCHEMA,
    tableName: 'Reflection'
});

Reflection.belongsTo(User, {
    foreignKey: { name: 'author', allowNull: false },
    targetKey: 'id',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});

User.hasMany(Reflection, {
    foreignKey: { name: 'author', allowNull: false },
    sourceKey: 'id',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});

// Tag model for article tagging
const Tag = sequelize.define('Tag', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    }
}, {
    timestamps: true,
    schema: process.env.PG_SCHEMA,
    tableName: 'Tag'

});

// Many-to-many Article <-> Tag
const ArticleTag = sequelize.define('ArticleTag', {
    ArticleId: {
        type: DataTypes.INTEGER,
        references: {
            model: { tableName: 'Article', schema: process.env.PG_SCHEMA },
            key: 'id'
        }
    },
    TagId: {
        type: DataTypes.INTEGER,
        references: {
            model: { tableName: 'Tag', schema: process.env.PG_SCHEMA },
            key: 'id'
        }
    }
}, {
    timestamps: false,
    schema: process.env.PG_SCHEMA,
    tableName: 'ArticleTag'
});

Article.belongsToMany(Tag, { through: ArticleTag });
Tag.belongsToMany(Article, { through: ArticleTag });

// Many-to-many Trick <-> Tag
const TrickTag = sequelize.define('TrickTag', {
    TrickId: {
        type: DataTypes.INTEGER,
        references: {
            model: { tableName: 'Trick', schema: process.env.PG_SCHEMA },
            key: 'id'
        }
    },
    TagId: {
        type: DataTypes.INTEGER,
        references: {
            model: { tableName: 'Tag', schema: process.env.PG_SCHEMA },
            key: 'id'
        }
    }
}, {
    timestamps: false,
    schema: process.env.PG_SCHEMA,
    tableName: 'TrickTag'
});

Trick.belongsToMany(Tag, { through: TrickTag });
Tag.belongsToMany(Trick, { through: TrickTag });

const File = sequelize.define('File', {
    slug: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
        
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false

    },
    buff: {
        type: DataTypes.BLOB,
        allowNull: true

    },
    disk_path: {
        type: DataTypes.STRING,
        allowNull: true
    },
    trick: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: {
                tableName: 'Trick',
                schema: process.env.PG_SCHEMA
            },
            key: 'id'
        }
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true

    },
    mime: {
        type: DataTypes.STRING,
        allowNull: false
        
    }
}, {
    timestamps: true,
    schema: process.env.PG_SCHEMA,
    tableName: 'File'

})

export const initDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection to DB has been established successfully.');
        await sequelize.sync({ alter: true });
        console.log('All models were synchronized successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

// Article and File votes to allow users to up/downvote
const ArticleVote = sequelize.define('ArticleVote', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    value: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    UserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: { tableName: 'User', schema: process.env.PG_SCHEMA },
            key: 'id'
        }
    },
    ArticleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: { tableName: 'Article', schema: process.env.PG_SCHEMA },
            key: 'id'
        }
    }
}, {
    timestamps: true,
    schema: process.env.PG_SCHEMA,
    tableName: 'ArticleVote',
    indexes: [
        { unique: true, fields: ['UserId', 'ArticleId'] }
    ]
});

const FileVote = sequelize.define('FileVote', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    value: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    UserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: { tableName: 'User', schema: process.env.PG_SCHEMA },
            key: 'id'
        }
    },
    FileId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: { tableName: 'File', schema: process.env.PG_SCHEMA },
            key: 'id'
        }
    }
}, {
    timestamps: true,
    schema: process.env.PG_SCHEMA,
    tableName: 'FileVote',
    indexes: [
        { unique: true, fields: ['UserId', 'FileId'] }
    ]
});

// Associations for votes
Article.hasMany(ArticleVote, { foreignKey: 'ArticleId' });
ArticleVote.belongsTo(Article, { foreignKey: 'ArticleId' });
User.hasMany(ArticleVote, { foreignKey: 'UserId' });
ArticleVote.belongsTo(User, { foreignKey: 'UserId' });

File.hasMany(FileVote, { foreignKey: 'FileId' });
FileVote.belongsTo(File, { foreignKey: 'FileId' });
User.hasMany(FileVote, { foreignKey: 'UserId' });
FileVote.belongsTo(User, { foreignKey: 'UserId' });

const TrickVote = sequelize.define('TrickVote', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    value: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    UserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: { tableName: 'User', schema: process.env.PG_SCHEMA },
            key: 'id'
        }
    },
    TrickId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: { tableName: 'Trick', schema: process.env.PG_SCHEMA },
            key: 'id'
        }
    }
}, {
    timestamps: true,
    schema: process.env.PG_SCHEMA,
    tableName: 'TrickVote',
    indexes: [
        { unique: true, fields: ['UserId', 'TrickId'] }
    ]
});

Trick.hasMany(TrickVote, { foreignKey: 'TrickId' });
TrickVote.belongsTo(Trick, { foreignKey: 'TrickId' });
User.hasMany(TrickVote, { foreignKey: 'UserId' });
TrickVote.belongsTo(User, { foreignKey: 'UserId' });

export { sequelize, Article, File, User, Tag, ArticleTag, ArticleVote, FileVote, Trick, TrickTag, TrickVote, Reflection };

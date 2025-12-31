import dotenv from 'dotenv';

dotenv.config();

const prismaConfig = {
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

export default prismaConfig;


// models/Lender.js
import { DataTypes } from "sequelize";
import sequelize from "./db.js";

const Lender = sequelize.define(
  "lenders",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
  },
  { timestamps: false }
);

export default Lender;

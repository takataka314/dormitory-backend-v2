// models/Item.js
import { DataTypes } from "sequelize";
import sequelize from "./db.js";

const Item = sequelize.define(
  "items",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
    total_qty: { type: DataTypes.INTEGER, defaultValue: 1 },
    note: { type: DataTypes.TEXT },
  },
  { timestamps: false }
);

export default Item;

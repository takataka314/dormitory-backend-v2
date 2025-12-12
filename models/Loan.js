// models/Loan.js
import { DataTypes } from "sequelize";
import sequelize from "./db.js";
import Item from "./Item.js";
import Lender from "./Lender.js";
import User from "./User.js";

const Loan = sequelize.define(
  "loans",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    item_id: { type: DataTypes.INTEGER, allowNull: false },
    lender_id: { type: DataTypes.INTEGER, allowNull: false },
    qty: { type: DataTypes.INTEGER, allowNull: false },
    room: { type: DataTypes.STRING, allowNull: false },
    staff_id: { type: DataTypes.INTEGER },
    borrowed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    returned_at: { type: DataTypes.DATE },
  },
  { timestamps: false }
);

// 外部キー
Loan.belongsTo(Item, { foreignKey: "item_id" });
Loan.belongsTo(Lender, { foreignKey: "lender_id" });
Loan.belongsTo(User, { foreignKey: "staff_id" });

export default Loan;

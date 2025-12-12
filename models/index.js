// models/index.js
import sequelize from "./db.js";
import User from "./User.js";
import Item from "./Item.js";
import Lender from "./Lender.js";
import Loan from "./Loan.js";

// モデルを初期化
User.initModel(sequelize);
Item.initModel(sequelize);
Lender.initModel(sequelize);
Loan.initModel(sequelize);

// 必要ならアソシエーションもここで（Loan.js 内にあるなら不要）
Loan.associate({ User, Item, Lender });

export { sequelize, User, Item, Lender, Loan };

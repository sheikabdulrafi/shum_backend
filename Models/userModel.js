import mongoose from "mongoose";

// Define day-wise consumption schema
const dayWiseConsumptionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  totalConsumption: {
    type: Number,
    required: true,
    default: 0,
  },
});

// Define appliance schema
const applianceSchema = new mongoose.Schema({
  isRunning: {
    type: Boolean,
    default: false, // Default to false
  },
  upTime: {
    type: Date,
    default: null,
  },
  consumption: {
    type: Number,
    default: 0, // Default to 0
  },
  totalConsumption: {
    type: Number,
    default: 0, // Default to 0
  },
  dayWiseConsumption: {
    type: [dayWiseConsumptionSchema], // Array of daily consumption records
    default: [], // Default to an empty array; will be populated in userSchema pre-save
  },
});

// Define user schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  light: {
    type: applianceSchema,
    default: {}, // Default to an empty object
  },
  fan: {
    type: applianceSchema,
    default: {}, // Default to an empty object
  },
  fridge: {
    type: applianceSchema,
    default: {}, // Default to an empty object
  },
  ac: {
    type: applianceSchema,
    default: {}, // Default to an empty object
  },
  tv: {
    type: applianceSchema,
    default: {}, // Default to an empty object
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save middleware to add initial day-wise consumption record for each appliance
userSchema.pre("save", function (next) {
  const creationDate = new Date();
  const initialConsumption = { date: creationDate, totalConsumption: 0 };

  // Initialize each appliance's dayWiseConsumption with the creation date and 0 consumption
  if (this.isNew) {
    this.light.dayWiseConsumption = [initialConsumption];
    this.fan.dayWiseConsumption = [initialConsumption];
    this.fridge.dayWiseConsumption = [initialConsumption];
    this.ac.dayWiseConsumption = [initialConsumption];
    this.tv.dayWiseConsumption = [initialConsumption];
  }

  next();
});

// Define the method on applianceSchema
applianceSchema.methods.updateDayWiseConsumption = function (consumption = 0) {
  const currentDate = new Date();
  const today = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  );

  // Check if there is an entry for today in dayWiseConsumption
  let dayRecord = this.dayWiseConsumption.find((record) => {
    const recordDate = new Date(record.date);
    return recordDate.getTime() === today.getTime();
  });

  if (dayRecord) {
    // If an entry exists, update the totalConsumption for today
    dayRecord.totalConsumption += consumption;
  } else {
    // Otherwise, create a new entry for today with totalConsumption
    this.dayWiseConsumption.push({
      date: today,
      totalConsumption: consumption,
    });
  }
};

const User = mongoose.model("User", userSchema);

export default User;

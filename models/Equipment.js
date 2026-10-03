const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema({
    equipmentId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    location: {
        type: String,
        required: true,
        trim: true
    },

    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },

    status: {
        type: String,
        enum: ["Available", "Maintenance", "Missing"],
        default: "Available"
    },

    condition: {
        type: String,
        enum: ["Good", "Damaged", "Needs Repair"],
        default: "Good"
    },

    description: {
        type: String
    },

    maintenanceHistory: [
        {
            date: {
                type: Date,
                default: Date.now
            },

            issue: {
                type: String
            },

            action: {
                type: String
            }
        }
    ]
});

module.exports = mongoose.model("Equipment", equipmentSchema);
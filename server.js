const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Equipment = require("./models/Equipment");

const app = express();


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// ==========================================
// HOME PAGE
// ==========================================

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});


// ==========================================
// GET ALL EQUIPMENT
// ==========================================

app.get("/equipment", async (req, res) => {
    try {
        const equipment = await Equipment.find();

        res.json(equipment);

    } catch (error) {
        console.error(
            "Error fetching equipment:",
            error.message
        );

        res.status(500).json({
            error: error.message
        });
    }
});


// ==========================================
// GET ALL MAINTENANCE RECORDS
// ==========================================

app.get("/maintenance", async (req, res) => {
    try {

        const equipment = await Equipment.find();

        const records = [];

        equipment.forEach((item) => {

            const history =
                item.maintenanceHistory || [];

            history.forEach((record) => {

                records.push({
                    equipmentId: item.equipmentId,
                    equipmentName: item.name,
                    location: item.location,
                    issue: record.issue,
                    action: record.action,
                    date: record.date
                });

            });

        });


        // Newest maintenance records first
        records.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });


        res.json(records);

    } catch (error) {

        console.error(
            "Error fetching maintenance records:",
            error.message
        );

        res.status(500).json({
            error: error.message
        });
    }
});


// ==========================================
// ADD EQUIPMENT
// ==========================================

app.post("/equipment", async (req, res) => {

    try {

        const equipment =
            new Equipment(req.body);

        await equipment.save();

        res.status(201).json({
            message: "Equipment added successfully!",
            equipment: equipment
        });

    } catch (error) {

        console.error(
            "Error adding equipment:",
            error.message
        );


        // Duplicate Equipment ID
        if (error.code === 11000) {

            return res.status(400).json({
                error:
                    "Equipment ID already exists. Please use a unique ID."
            });
        }


        res.status(500).json({
            error: error.message
        });
    }
});


// ==========================================
// UPDATE COMPLETE EQUIPMENT
// ==========================================

app.put("/equipment/:id", async (req, res) => {

    try {

        const {
            equipmentId,
            name,
            location,
            quantity,
            status,
            condition,
            description
        } = req.body;


        // Required fields
        if (
            !equipmentId ||
            !name ||
            !location ||
            quantity === undefined
        ) {

            return res.status(400).json({
                error:
                    "Equipment ID, name, location and quantity are required."
            });
        }


        // Quantity validation
        if (Number(quantity) < 1) {

            return res.status(400).json({
                error:
                    "Quantity must be at least 1."
            });
        }


        const equipment =
            await Equipment.findByIdAndUpdate(
                req.params.id,

                {
                    equipmentId:
                        equipmentId.trim(),

                    name:
                        name.trim(),

                    location:
                        location.trim(),

                    quantity:
                        Number(quantity),

                    status:
                        status,

                    condition:
                        condition,

                    description:
                        description
                },

                {
                    new: true,
                    runValidators: true
                }
            );


        if (!equipment) {

            return res.status(404).json({
                error:
                    "Equipment not found"
            });
        }


        res.json({
            message:
                "Equipment updated successfully!",
            equipment:
                equipment
        });

    } catch (error) {

        console.error(
            "Error updating equipment:",
            error.message
        );


        // Duplicate Equipment ID
        if (error.code === 11000) {

            return res.status(400).json({
                error:
                    "Equipment ID already exists. Please use a unique ID."
            });
        }


        res.status(500).json({
            error: error.message
        });
    }
});


// ==========================================
// DELETE EQUIPMENT
// ==========================================

app.delete("/equipment/:id", async (req, res) => {

    try {

        const equipment =
            await Equipment.findByIdAndDelete(
                req.params.id
            );


        if (!equipment) {

            return res.status(404).json({
                error:
                    "Equipment not found"
            });
        }


        res.json({
            message:
                "Equipment deleted successfully!"
        });

    } catch (error) {

        console.error(
            "Error deleting equipment:",
            error.message
        );

        res.status(500).json({
            error: error.message
        });
    }
});


// ==========================================
// REPORT PROBLEM / ADD MAINTENANCE
// ==========================================

app.post(
    "/equipment/:id/maintenance",
    async (req, res) => {

        try {

            const equipment =
                await Equipment.findById(
                    req.params.id
                );


            if (!equipment) {

                return res.status(404).json({
                    error:
                        "Equipment not found"
                });
            }


            const {
                issue,
                action
            } = req.body;


            if (!issue || !action) {

                return res.status(400).json({
                    error:
                        "Issue and action are required"
                });
            }


            equipment.maintenanceHistory.push({

                issue:
                    issue.trim(),

                action:
                    action.trim(),

                date:
                    new Date()

            });


            // Automatically update status
            equipment.status =
                "Maintenance";


            // Automatically update condition
            equipment.condition =
                "Needs Repair";


            await equipment.save();


            res.status(201).json({

                message:
                    "Maintenance report added successfully!",

                equipment:
                    equipment

            });

        } catch (error) {

            console.error(
                "Error adding maintenance report:",
                error.message
            );

            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);


// ==========================================
// START SERVER
// ==========================================

async function startServer() {

    try {

        // Connect to MongoDB Atlas
        await mongoose.connect(
            process.env.MONGO_URI,
            {
                dbName: "lab_management"
            }
        );


        console.log(
            "MongoDB Atlas Connected Successfully!"
        );


        // ======================================
        // UPDATE OLD RECORDS
        // ======================================

        const oldEquipment =
            await Equipment.find();


        let idNumber = 1;


        for (const item of oldEquipment) {

            const updates = {};


            // Add Equipment ID to old records
            if (!item.equipmentId) {

                updates.equipmentId =
                    `EQ-${String(idNumber)
                        .padStart(3, "0")}`;
            }


            // Add location to old records
            if (!item.location) {

                updates.location =
                    "Not specified";
            }


            // Add quantity to old records
            if (!item.quantity) {

                updates.quantity =
                    1;
            }


            // Save changes if needed
            if (
                Object.keys(updates).length > 0
            ) {

                await Equipment.updateOne(
                    { _id: item._id },
                    { $set: updates }
                );
            }


            idNumber++;
        }


        console.log(
            "Existing equipment records checked successfully!"
        );


        // ======================================
        // START WEB SERVER
        // ======================================

        const PORT =
            process.env.PORT || 3000;


        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log(
                    `Server running on port ${PORT}`
                );

            }
        );


    } catch (error) {

        console.error(
            "MongoDB Connection Failed:"
        );

        console.error(
            error.message
        );
    }
}


// ==========================================
// RUN SERVER
// ==========================================

startServer();
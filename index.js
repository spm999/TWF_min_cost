const express = require("express");
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5172;

const router=require('./router.js');
app.use(router);

app.use(bodyParser.json());


// Function to calculate the minimum cost for fulfilling an order
function calculateMinimumCost(orderDetails) {
    // List of warehouses
    const warehouses = ["Warehouse1", "Center1", "Center2", "Center3"];

    // Stock available at each center
    const centerStock = {
        Center1: { A: 3, B: 2, C: 8 },
        Center2: { D: 12, E: 25, F: 15 },
        Center3: { G: 0.5, H: 1, I: 2 },
    };

    // Distances between warehouses
    const distances = {
        Center1_Center2: 4,
        Center2_Center3: 3,
        Center3_Center1: 5,
        Center3_Warehouse1: 2,
        Center1_Warehouse1: 3,
        Center2_Warehouse1: 2.5,
    };

    // Function to calculate the minimum cost recursively
    function calculateCost(
        totalWeight,
        weightObj
    ) {
        // Calculate the sum of weights at each center
        const sumWeights = {
            Center1: Object.values(weightObj.Center1).reduce((accumulator, currentValue) => accumulator + currentValue, 0),
            Center2: Object.values(weightObj.Center2).reduce((accumulator, currentValue) => accumulator + currentValue, 0),
            Center3: Object.values(weightObj.Center3).reduce((accumulator, currentValue) => accumulator + currentValue, 0),
        };

        function helper(
            warehouse,
            currentWeight,
            weightTransferred,
            visited,
            cache
        ) {
            const key = `${warehouse}_${currentWeight}_${weightTransferred}`;

            if (cache[key]) {
                return cache[key];
            }

            if (weightTransferred === totalWeight) {
                if (warehouse === "Warehouse1") return 0;

                const res =
                    costFromWeight(currentWeight) * distances[warehouse + "_Warehouse1"] +
                    helper("Warehouse1", currentWeight, weightTransferred, visited, cache);

                cache[key] = res;

                return res;
            }
            let minCost = Number.MAX_VALUE;
            for (const newWarehouse of warehouses) {
                if (
                    visited[newWarehouse] ||
                    (!sumWeights[newWarehouse] && newWarehouse !== "Warehouse1") ||
                    newWarehouse === warehouse
                )
                    continue;

                const newWeight = sumWeights[newWarehouse] ? sumWeights[newWarehouse] : 0;
                const distance =
                    distances[warehouse + "_" + newWarehouse] ||
                    distances[newWarehouse + "_" + warehouse];

                minCost = Math.min(
                    minCost,
                    (warehouse
                        ? distance * (warehouse === "Warehouse1" ? 10 : costFromWeight(currentWeight + newWeight))
                        : 0) +
                    helper(
                        newWarehouse,
                        currentWeight + sumWeights[newWarehouse] ? sumWeights[newWarehouse] : 0,
                        weightTransferred + newWeight,
                        {
                            ...visited,
                            [newWarehouse]: newWarehouse !== "Warehouse1",
                        },
                        cache
                    )
                );
            }
            cache[key] = minCost;

            return minCost;
        }
        // Function to calculate cost based on weight
        function costFromWeight(weight) {
            if (weight <= 5) return 10;

            return 10 + Math.ceil((weight - 5) / 5) * 8;
        }
        const visited = {};
        const minCost = helper("", 0, 0, visited, {});

        return minCost;
    }

    // Convert product names to uppercase
    const upperCasePayload = {};
    for (const key in orderDetails) {
        upperCasePayload[key.toUpperCase()] = orderDetails[key];
    }

    let minCost = 0;
    const weightObj = {
        Center1: {},
        Center2: {},
        Center3: {},
    };
    let totalWeight = 0;
    const invalidProducts = [];

    // Calculate total weight and check for invalid products
    for (const i in orderDetails) {
        const item = i.toUpperCase();
        if (Object.keys(centerStock.Center1).includes(item)) {
            totalWeight += weightObj.Center1[item] = centerStock.Center1[item] * orderDetails[i];
        } else if (Object.keys(centerStock.Center2).includes(item)) {
            totalWeight += weightObj.Center2[item] = centerStock.Center2[item] * orderDetails[i];
        } else if (Object.keys(centerStock.Center3).includes(item)) {
            totalWeight += weightObj.Center3[item] = centerStock.Center3[item] * orderDetails[i];
        } else {
            invalidProducts.push(i);
        }
    }

    // Throw error if invalid products are found
    if (invalidProducts.length) {
        throw new Error(
            `Product is not available in the warehouse. Please choose a valid product. Invalid Products: ${invalidProducts}`
        );
    }
    minCost = calculateCost(totalWeight, weightObj);
    return minCost;
}

app.use(express.json());

// API endpoint to calculate cost
app.post("/calculateCost", (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({
                error: "Product List is missing. Pleae add product.",
            });
        }

        const minCost = calculateMinimumCost(req.body);

        res.json({ minCost });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "An error occurred.", errorCode: "internalServerError" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

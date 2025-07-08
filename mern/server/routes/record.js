import express from "express";
import db from "../db/connection.js";
import { ObjectId } from "mongodb";
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = express.Router();
const upload = multer();
const collection = () => db.collection("records");

// Helper to check valid date strings
function isValidDate(val) {
  const d = new Date(val);
  return val && !isNaN(d.getTime());
}
// Analytics Endpoint
router.get("/analytics", async (req, res) => {
  try {
    const records = await db.collection("records").find({}).toArray();

    console.log(`[analytics] Total records: ${records.length}`);

    const categories = Array.from(
      new Set(records.map(r => r.item_category_detail?.split("|").pop()?.trim() || "Unknown"))
    );

    const totalProducts = records.length;
    const totalSales = records.reduce((sum, r) => sum + (parseInt(r.total_sold) || 0), 0);

    const validRatings = records
      .map(r => parseFloat(r.item_rating))
      .filter(n => !isNaN(n));
    const avgRating = validRatings.length > 0
      ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length
      : 0;

    const salesByCategory = categories.map(category => {
      const catRecords = records.filter(r => {
        const catName = r.item_category_detail?.split("|").pop()?.trim();
        return catName === category;
      });
      return {
        name: category,
        value: catRecords.reduce((sum, r) => sum + (parseInt(r.total_sold) || 0), 0)
      };
    });

    const productsByCategory = categories.map(category => {
      return {
        category,
        count: records.filter(r => {
          const catName = r.item_category_detail?.split("|").pop()?.trim();
          return catName === category;
        }).length
      };
    });

    const avgPriceByCategory = categories.map(category => {
      const catRecords = records.filter(r => {
        const catName = r.item_category_detail?.split("|").pop()?.trim();
        return catName === category;
      });
      const prices = catRecords.map(r => parseFloat(r.price_actual)).filter(p => !isNaN(p));
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      return { category, avgPrice: parseFloat(avgPrice.toFixed(2)) };
    });

    const priceRangeByCategory = categories.map(category => {
      const catRecords = records.filter(r => {
        const catName = r.item_category_detail?.split("|").pop()?.trim();
        return catName === category;
      });
      const prices = catRecords.map(r => parseFloat(r.price_actual)).filter(p => !isNaN(p));
      const minPrice = prices.length ? Math.min(...prices) : 0;
      const maxPrice = prices.length ? Math.max(...prices) : 0;
      return {
        category,
        minPrice: parseFloat(minPrice.toFixed(2)),
        maxPrice: parseFloat(maxPrice.toFixed(2))
      };
    });

    const sellerPerformanceMap = {};
    for (const r of records) {
      const seller = r.seller_name || 'Unknown';
      if (!sellerPerformanceMap[seller]) {
        sellerPerformanceMap[seller] = { seller, products: 0, sales: 0 };
      }
      sellerPerformanceMap[seller].products += 1;
      sellerPerformanceMap[seller].sales += parseInt(r.total_sold) || 0;
    }
    const sellerPerformance = Object.values(sellerPerformanceMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    res.json({
      totalProducts,
      totalSales,
      avgRating,
      categories,
      salesByCategory,
      productsByCategory,
      avgPriceByCategory,
      priceRangeByCategory,
      sellerPerformance
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET paginated records
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 500;
    const skip = (page - 1) * limit;

    const col = await collection();
    const total = await col.countDocuments();
    const records = await col.find({}).skip(skip).limit(limit).toArray();

    res.status(200).json({ records, total, page, pages: Math.ceil(total / limit), limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching records" });
  }
});

// GET single record
router.get("/:id", async (req, res) => {
  try {
    const record = await collection().findOne({ _id: new ObjectId(req.params.id) });
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching record" });
  }
});

// POST new record
router.post("/", async (req, res) => {
  try {
    const now = new Date();
    const doc = {
      price_ori: parseFloat(req.body.price_ori) || 0,
      delivery: req.body.delivery || '',
      item_category_detail: req.body.item_category_detail || '',
      specification: req.body.specification || '',
      title: req.body.title || '',
      w_date: isValidDate(req.body.w_date) ? new Date(req.body.w_date) : now,
      link_ori: req.body.link_ori || '',
      item_rating: Math.min(5, Math.max(0, parseFloat(req.body.item_rating) || 0)),
      total_rating: parseInt(req.body.total_rating) || 0,
      seller_name: req.body.seller_name || '',
      price_actual: parseFloat(req.body.price_actual) || 0,
      sitename: req.body.sitename || '',
      total_sold: parseInt(req.body.total_sold) || 0,
      favorite: req.body.favorite === 'true' || req.body.favorite === true,
      timestamp: isValidDate(req.body.timestamp) ? new Date(req.body.timestamp) : now,
      createdAt: now,
      updatedAt: now
    };

    const result = await collection().insertOne(doc);
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH update
router.patch("/:id", async (req, res) => {
  try {
    const now = new Date();
    const updates = {
      $set: {
        price_ori: parseFloat(req.body.price_ori) || 0,
        price_actual: parseFloat(req.body.price_actual) || 0,
        item_rating: Math.min(5, Math.max(0, parseFloat(req.body.item_rating) || 0)),
        total_rating: parseInt(req.body.total_rating) || 0,
        total_sold: parseInt(req.body.total_sold) || 0,
        w_date: isValidDate(req.body.w_date) ? new Date(req.body.w_date) : now,
        timestamp: isValidDate(req.body.timestamp) ? new Date(req.body.timestamp) : now,
        favorite: req.body.favorite === 'true' || req.body.favorite === true,
        updatedAt: now
      }
    };

    const result = await collection().updateOne(
      { _id: new ObjectId(req.params.id) },
      updates
    );
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE single
router.delete("/:id", async (req, res) => {
  try {
    const result = await collection().deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE all
router.delete("/", async (req, res) => {
  try {
    const result = await collection().deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// CSV bulk upload
router.post("/bulk", upload.single("csv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No CSV file uploaded"
      });
    }

    const products = [];
    const uploadTime = new Date();
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", (row) => {
          const product = {
            _id: new ObjectId(),

            // Visible fields
            price_actual: parseFloat(row.current_price) || 0,
            price_ori: parseFloat(row.original_price) || 0,
            delivery: row.delivery || '',
            item_category_detail: row.category || '',
            title: row.title || '',
            specification: row.specification || '',
            link_ori: row.product_url || '',
            item_rating: Math.min(5, Math.max(0, parseFloat(row.rating) || 0)),
            total_rating: parseInt(row.total_rating) || 0,
            seller_name: row.seller || '',
            total_sold: parseInt(row.total_sold) || 0,
            sitename: row.sitename || '',
            favorite: row.favorite === 'true' || row.favorite === true || row.favorite === 1,

            w_date: isValidDate(row.listing_date) ? new Date(row.listing_date) : null,
            timestamp: uploadTime,
            createdAt: uploadTime,
            updatedAt: uploadTime,

            idElastic: row.idElastic || '',
            idHash: row.idHash || '',
            id: row.id || new ObjectId().toString(),
            pict_link: row.pict_link || ''
          };

          products.push(product);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid products found in CSV"
      });
    }

    const collection = await db.collection("records");
    const result = await collection.insertMany(products);

    res.status(200).json({
      success: true,
      insertedCount: result.insertedCount,
      message: `${result.insertedCount} products added successfully`
    });
  } catch (err) {
    console.error("CSV upload error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;

const Review = require('../models/Review');

/**
 * LUXE BERLIN - REVIEW CONTROLLER
 */

exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Fehler beim Laden der Rezensionen." });
    }
};

exports.createReview = async (req, res) => {
    try {
        // Model ile tam uyum (text/comment & rating/stars fallbacks)
        const newReview = new Review({
            name: req.body.name,
            text: req.body.text || req.body.comment,
            rating: req.body.rating || req.body.stars || 5
        });
        await newReview.save();
        res.status(201).json(newReview);
    } catch (err) {
        res.status(400).json({ message: "Fehler beim Senden." });
    }
};

exports.replyToReview = async (req, res) => {
    try {
        const updatedReview = await Review.findByIdAndUpdate(
            req.params.id,
            { adminReply: req.body.replyText },
            { new: true }
        );
        if (!updatedReview) return res.status(404).json({ message: "Rezension nicht gefunden." });
        res.json(updatedReview);
    } catch (err) {
        res.status(500).json({ message: "Fehler beim Antworten." });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const deleted = await Review.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Rezension nicht gefunden." });
        res.json({ success: true, message: "Rezension gelöscht." });
    } catch (err) {
        res.status(500).json({ message: "Fehler beim Löschen." });
    }
};
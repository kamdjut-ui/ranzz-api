const axios = require('axios');

async function ytdown(url, type = 'video') {
    try {
        const { data } = await axios.post('https://app.ytdown.to/proxy.php', 
            new URLSearchParams({ url }), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const api = data.api;
        if (api?.status == 'ERROR') throw new Error(api.message);

        // Mencari tipe media yang sesuai (video/audio)
        const media = api?.mediaItems?.find((m) => m.type.toLowerCase() === type.toLowerCase());
        if (!media) throw new Error(`Tipe media '${type}' tidak ditemukan.`);

        // Polling loop untuk mendapatkan link final
        let attempts = 0;
        const maxAttempts = 15; // Maksimal 75 detik agar tidak melampaui timeout Vercel

        while (attempts < maxAttempts) {
            const { data: res } = await axios.get(media.mediaUrl);

            if (res?.error === 'METADATA_NOT_FOUND') throw new Error('Metadata video tidak ditemukan.');

            if (res?.percent === 'Completed' && res?.fileUrl && res.fileUrl !== 'In Processing...') {
                return {
                    title: api.title,
                    description: api.description,
                    thumbnail: api.imagePreviewUrl,
                    views: api.mediaStats?.viewsCount,
                    uploader: api.userInfo?.name,
                    quality: media.mediaQuality,
                    duration: media.mediaDuration,
                    extension: media.mediaExtension,
                    size: media.mediaFileSize,
                    download: res.fileUrl
                };
            }

            attempts++;
            // Menunggu 5 detik sebelum cek lagi
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        throw new Error('Proses server terlalu lama, silakan coba lagi.');
    } catch (error) {
        throw error;
    }
}

module.exports = function (app) {
    app.get('/download/yt', async (req, res) => {
        const { url, type = 'video' } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "Ranzz",
                message: "Masukkan parameter URL YouTube!"
            });
        }

        try {
            const results = await ytdown(url, type);
            res.status(200).json({
                status: true,
                creator: "Ranzz",
                result: results
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "Ranzz",
                message: error.message || "Terjadi kesalahan internal."
            });
        }
    });
};

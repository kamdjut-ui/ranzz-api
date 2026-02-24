const axios = require('axios');

async function ytdown(url, type = 'video') {
    const { data } = await axios.post('https://app.ytdown.to/proxy.php', 
        new URLSearchParams({ url }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const api = data.api;
    if (api?.status == 'ERROR') throw new Error(api.message);

    const media = api?.mediaItems?.find((m) => m.type.toLowerCase() === type.toLowerCase());
    if (!media) throw new Error('Media type not found');

    let attempts = 0;
    while (attempts < 15) {
        const { data: res } = await axios.get(media.mediaUrl);
        if (res?.error === 'METADATA_NOT_FOUND') throw new Error('Metadata not found');

        if (res?.percent === 'Completed' && res?.fileUrl !== 'In Processing...') {
            return {
                title: api.title,
                thumbnail: api.imagePreviewUrl,
                uploader: api.userInfo?.name,
                quality: media.mediaQuality,
                extension: media.mediaExtension,
                size: media.mediaFileSize,
                duration: media.mediaDuration,
                download: res.fileUrl
            };
        }
        attempts++;
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error('Timeout: Gagal mendapatkan link download.');
}

module.exports = function (app) {
    app.get('/download/yt', async (req, res) => {
        const { url, type = 'video' } = req.query;
        
        if (!url) return res.json({ 
            status: false, 
            creator: "Ranzz", 
            message: "Masukkan parameter URL!" 
        });

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
                message: error.message
            });
        }
    });
};

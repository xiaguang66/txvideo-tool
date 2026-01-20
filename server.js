const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs'); // 添加fs模块用于文件读写

const app = express();
const PORT = process.env.PORT || 6688;

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 密钥存储，区分管理员和普通用户
const SECRET_KEYS = [
    { key: 'shushu6688787878@@!!', type: 'admin' },
    { key: 'Hsy20080618SkywalkerStan', type: 'user' },
    { key: 'mk149478', type: 'user' },
    { key: 'Mark%d', type: 'user' },
    { key: '240412', type: 'user' },
    { key: 'password', type: 'user' },
    { key: 'MSM51ka', type: 'user' },
    { key: 'LightMist5220', type: 'user' },
    { key: 'sh3712', type: 'user' },
    { key: '2026927071', type: 'user' },
    { key: '14565378613701161', type: 'user' },
    { key: '998244353', type: 'user' },
    { key: 'azureseeker666', type: 'user' },
    { key: 'zhz_4wiel2', type: 'user' },
    { key: 'Wanderer', type: 'user' }
];

const sessions = new Map();

// 存储每个用户每天的上传计数
// 结构: { 'key-date': count }
const uploadCounts = new Map();

// 获取当前日期字符串 (YYYY-MM-DD)
function getCurrentDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 清理旧的上传计数（保留最近7天的数据）
function cleanupOldUploadCounts() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;
    
    for (const key of uploadCounts.keys()) {
        const [, dateStr] = key.split('-');
        if (dateStr < sevenDaysAgoStr) {
            uploadCounts.delete(key);
        }
    }
}

app.post('/api/login', (req, res) => {
    const { key } = req.body;
    
    if (!key) {
        return res.status(400).json({ success: false, message: '请输入秘钥' });
    }
    
    // 查找密钥并验证类型
    const keyRecord = SECRET_KEYS.find(record => record.key === key);
    
    if (keyRecord) {
        const sessionId = generateSessionId();
        sessions.set(sessionId, { 
            key: keyRecord.key, 
            type: keyRecord.type, // 存储用户类型
            loginTime: Date.now() 
        });
        
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });
        
        res.json({ 
            success: true, 
            message: '登录成功',
            userType: keyRecord.type // 返回用户类型
        });
    } else {
        res.status(401).json({ success: false, message: '秘钥无效' });
    }
});

app.get('/api/check-auth', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        res.json({ 
            authenticated: true, 
            userType: session.type // 返回用户类型
        });
    } else {
        res.json({ authenticated: false });
    }
});

// 添加密钥管理API
// 获取所有密钥（仅管理员可访问）
app.get('/api/keys', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: '未授权访问' });
    }
    
    const session = sessions.get(sessionId);
    if (session.type !== 'admin') {
        return res.status(403).json({ error: '权限不足' });
    }
    
    res.json({ keys: SECRET_KEYS });
});

// 添加新密钥（仅管理员可访问）
app.post('/api/keys', (req, res) => {
    const sessionId = req.cookies.sessionId;
    const { key, type } = req.body;
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: '未授权访问' });
    }
    
    const session = sessions.get(sessionId);
    if (session.type !== 'admin') {
        return res.status(403).json({ error: '权限不足' });
    }
    
    if (!key || !type || !['admin', 'user'].includes(type)) {
        return res.status(400).json({ error: '无效的密钥或类型' });
    }
    
    // 检查密钥是否已存在
    if (SECRET_KEYS.some(record => record.key === key)) {
        return res.status(400).json({ error: '密钥已存在' });
    }
    
    SECRET_KEYS.push({ key, type });
    res.json({ success: true, message: '密钥添加成功' });
});

// 删除密钥（仅管理员可访问）
app.delete('/api/keys/:key', (req, res) => {
    const sessionId = req.cookies.sessionId;
    const { key } = req.params;
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: '未授权访问' });
    }
    
    const session = sessions.get(sessionId);
    if (session.type !== 'admin') {
        return res.status(403).json({ error: '权限不足' });
    }
    
    const keyIndex = SECRET_KEYS.findIndex(record => record.key === key);
    if (keyIndex === -1) {
        return res.status(404).json({ error: '密钥不存在' });
    }
    
    SECRET_KEYS.splice(keyIndex, 1);
    res.json({ success: true, message: '密钥删除成功' });
});

app.post('/api/logout', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (sessionId) {
        sessions.delete(sessionId);
        res.clearCookie('sessionId');
    }
    
    res.json({ success: true, message: '退出成功' });
});

app.get('/api/video-data', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: '未授权访问' });
    }
    
    res.sendFile(path.join(__dirname, 'video-data.json'));
});

// 保存视频数据（POST请求）
app.post('/api/video-data', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: '未授权访问' });
    }
    
    const newData = req.body;
    
    // 验证数据格式
    if (!newData || !newData.categories || !Array.isArray(newData.categories)) {
        return res.status(400).json({ error: '无效的数据格式' });
    }
    
    // 验证每个视频ID长度不超过50个字符
    for (const category of newData.categories) {
        if (category.authors && Array.isArray(category.authors)) {
            for (const author of category.authors) {
                if (author.videos && Array.isArray(author.videos)) {
                    for (const video of author.videos) {
                        if (video.id && video.id.length > 50) {
                            return res.status(400).json({ error: `视频ID不能超过50个字符: ${video.id}` });
                        }
                    }
                }
            }
        }
    }
    
    try {
        // 读取当前数据以计算新增的视频数量
        const dataPath = path.join(__dirname, 'video-data.json');
        const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        // 计算当前数据中的视频总数
        function countVideos(data) {
            let count = 0;
            for (const category of data.categories) {
                if (category.authors && Array.isArray(category.authors)) {
                    for (const author of category.authors) {
                        if (author.videos && Array.isArray(author.videos)) {
                            count += author.videos.length;
                        }
                    }
                }
            }
            return count;
        }
        
        const currentVideoCount = countVideos(currentData);
        const newVideoCount = countVideos(newData);
        const addedVideoCount = newVideoCount - currentVideoCount;
        
        // 获取当前用户的密钥
        const session = sessions.get(sessionId);
        const userKey = session.key;
        
        // 获取当前日期
        const currentDate = getCurrentDate();
        const uploadKey = `${userKey}-${currentDate}`;
        
        // 清理旧的上传计数
        cleanupOldUploadCounts();
        
        // 获取用户当天的上传计数
        const currentUploadCount = uploadCounts.get(uploadKey) || 0;
        const newUploadCount = currentUploadCount + addedVideoCount;
        
        // 检查是否超过每天100条的限制
        if (newUploadCount > 100) {
            return res.status(400).json({ error: '今天已上传的视频数量超过限制（最多100条）' });
        }
        
        // 保存数据到文件
        fs.writeFileSync(dataPath, JSON.stringify(newData, null, 2), 'utf8');
        
        // 更新上传计数
        uploadCounts.set(uploadKey, newUploadCount);
        
        res.json({ success: true, message: '数据保存成功' });
    } catch (error) {
        console.error('保存数据失败:', error);
        res.status(500).json({ error: '保存数据失败' });
    }
});

// 新建分类（POST请求）
app.post('/api/categories', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: '未授权访问' });
    }
    
    const { name, id } = req.body;
    
    // 验证数据格式
    if (!name || !id) {
        return res.status(400).json({ error: '分类名称和ID不能为空' });
    }
    
    try {
        // 读取当前数据
        const dataPath = path.join(__dirname, 'video-data.json');
        const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        // 检查分类ID是否已存在
        if (currentData.categories.some(category => category.id === id)) {
            return res.status(400).json({ error: '分类ID已存在' });
        }
        
        // 添加新分类
        currentData.categories.push({ 
            id, 
            name, 
            authors: [] 
        });
        
        // 保存数据
        fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2), 'utf8');
        res.json({ success: true, message: '分类添加成功' });
    } catch (error) {
        console.error('添加分类失败:', error);
        res.status(500).json({ error: '添加分类失败' });
    }
});

// 新建作者（POST请求）
app.post('/api/authors', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: '未授权访问' });
    }
    
    const { categoryId, name, id } = req.body;
    
    // 验证数据格式
    if (!categoryId || !name || !id) {
        return res.status(400).json({ error: '分类ID、作者名称和作者ID不能为空' });
    }
    
    try {
        // 读取当前数据
        const dataPath = path.join(__dirname, 'video-data.json');
        const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        // 检查分类是否存在
        const category = currentData.categories.find(cat => cat.id === categoryId);
        if (!category) {
            return res.status(400).json({ error: '指定的分类不存在' });
        }
        
        // 检查作者ID是否已存在
        if (category.authors.some(author => author.id === id)) {
            return res.status(400).json({ error: '该分类下的作者ID已存在' });
        }
        
        // 添加新作者
        category.authors.push({ 
            id, 
            name, 
            videos: [] 
        });
        
        // 保存数据
        fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2), 'utf8');
        res.json({ success: true, message: '作者添加成功' });
    } catch (error) {
        console.error('添加作者失败:', error);
        res.status(500).json({ error: '添加作者失败' });
    }
});

// 删除视频、作者或分类（DELETE请求）
app.delete('/api/video-data', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: '未授权访问' });
    }
    
    // 只有管理员可以执行删除操作
    const session = sessions.get(sessionId);
    if (session.type !== 'admin') {
        return res.status(403).json({ error: '只有管理员可以执行删除操作' });
    }
    
    const { type, categoryId, authorId, videoId } = req.body;
    
    // 验证数据格式
    if (!type || !['video', 'author', 'category'].includes(type)) {
        return res.status(400).json({ error: '无效的删除类型' });
    }
    
    try {
        // 读取当前数据
        const dataPath = path.join(__dirname, 'video-data.json');
        const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        // 根据删除类型执行不同的删除操作
        if (type === 'video') {
            // 删除单个视频
            if (!categoryId || !authorId || !videoId) {
                return res.status(400).json({ error: '删除单个视频需要提供分类ID、作者ID和视频ID' });
            }
            
            const category = currentData.categories.find(cat => cat.id === categoryId);
            if (!category) {
                return res.status(400).json({ error: '指定的分类不存在' });
            }
            
            const author = category.authors.find(auth => auth.id === authorId);
            if (!author) {
                return res.status(400).json({ error: '指定的作者不存在' });
            }
            
            const videoIndex = author.videos.findIndex(vid => vid.id === videoId);
            if (videoIndex === -1) {
                return res.status(400).json({ error: '指定的视频不存在' });
            }
            
            // 删除视频
            author.videos.splice(videoIndex, 1);
            res.json({ success: true, message: '视频删除成功' });
        } else if (type === 'author') {
            // 删除作者及其所有视频
            if (!categoryId || !authorId) {
                return res.status(400).json({ error: '删除作者需要提供分类ID和作者ID' });
            }
            
            const category = currentData.categories.find(cat => cat.id === categoryId);
            if (!category) {
                return res.status(400).json({ error: '指定的分类不存在' });
            }
            
            const authorIndex = category.authors.findIndex(auth => auth.id === authorId);
            if (authorIndex === -1) {
                return res.status(400).json({ error: '指定的作者不存在' });
            }
            
            // 删除作者
            category.authors.splice(authorIndex, 1);
            res.json({ success: true, message: '作者及其所有视频删除成功' });
        } else if (type === 'category') {
            // 删除分类及其所有内容
            if (!categoryId) {
                return res.status(400).json({ error: '删除分类需要提供分类ID' });
            }
            
            const categoryIndex = currentData.categories.findIndex(cat => cat.id === categoryId);
            if (categoryIndex === -1) {
                return res.status(400).json({ error: '指定的分类不存在' });
            }
            
            // 删除分类
            currentData.categories.splice(categoryIndex, 1);
            res.json({ success: true, message: '分类及其所有内容删除成功' });
        }
        
        // 保存数据
        fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2), 'utf8');
    } catch (error) {
        console.error('删除操作失败:', error);
        res.status(500).json({ error: '删除操作失败' });
    }
});

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

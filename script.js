// Konfigurasi GitHub
class GitHubStorage {
    constructor() {
        this.owner = 'dilezma'; // Ganti dengan username GitHub Anda
        this.repo = 'photoge'; // Ganti dengan nama repository
        this.token = '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'; // Ganti dengan token GitHub Anda
        this.branch = 'main';
        
        this.baseURL = 'https://api.github.com';
        this.headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    }

    // Encode content ke base64
    encodeContent(content) {
        return btoa(unescape(encodeURIComponent(content)));
    }

    // Decode content dari base64
    decodeContent(content) {
        return decodeURIComponent(escape(atob(content)));
    }

    // Cek apakah file ada
    async fileExists(path) {
        try {
            const response = await fetch(
                `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`,
                { headers: this.headers }
            );
            return response.ok;
        } catch (error) {
            console.error('Error checking file:', error);
            return false;
        }
    }

    // Baca file dari GitHub
    async readFile(path) {
        try {
            const response = await fetch(
                `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`,
                { headers: this.headers }
            );
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return JSON.parse(this.decodeContent(data.content));
        } catch (error) {
            console.error('Error reading file:', error);
            this.showNotification('Error membaca data dari GitHub', 'error');
            return null;
        }
    }

    // Tulis file ke GitHub
    async writeFile(path, content, message = 'Update data') {
        try {
            // Dapatkan SHA dari file yang ada (jika ada)
            let sha = null;
            const exists = await this.fileExists(path);
            
            if (exists) {
                const existing = await fetch(
                    `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`,
                    { headers: this.headers }
                );
                const data = await existing.json();
                sha = data.sha;
            }
            
            const response = await fetch(
                `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`,
                {
                    method: 'PUT',
                    headers: this.headers,
                    body: JSON.stringify({
                        message: message,
                        content: this.encodeContent(JSON.stringify(content, null, 2)),
                        sha: sha,
                        branch: this.branch
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error writing file:', error);
            this.showNotification('Error menyimpan data ke GitHub', 'error');
            return false;
        }
    }

    // Upload gambar (simpan sebagai base64)
    async uploadImage(filename, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64Content = e.target.result.split(',')[1];
                    const path = `uploads/${filename}`;
                    
                    const response = await fetch(
                        `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`,
                        {
                            method: 'PUT',
                            headers: this.headers,
                            body: JSON.stringify({
                                message: `Upload image: ${filename}`,
                                content: base64Content,
                                branch: this.branch
                            })
                        }
                    );
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    resolve({
                        url: data.content.download_url,
                        sha: data.content.sha
                    });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Hapus file dari GitHub
    async deleteFile(path, message = 'Delete file') {
        try {
            // Dapatkan SHA terlebih dahulu
            const response = await fetch(
                `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`,
                { headers: this.headers }
            );
            
            if (!response.ok) {
                throw new Error(`File not found: ${path}`);
            }
            
            const data = await response.json();
            
            // Hapus file dengan SHA
            const deleteResponse = await fetch(
                `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`,
                {
                    method: 'DELETE',
                    headers: this.headers,
                    body: JSON.stringify({
                        message: message,
                        sha: data.sha,
                        branch: this.branch
                    })
                }
            );
            
            return deleteResponse.ok;
        } catch (error) {
            console.error('Error deleting file:', error);
            this.showNotification('Error menghapus file', 'error');
            return false;
        }
    }
}

// Inisialisasi storage
const storage = new GitHubStorage();

// Helper Functions
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function getCurrentUser() {
    return localStorage.getItem('currentUser');
}

function setCurrentUser(username) {
    localStorage.setItem('currentUser', username);
}

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    window.location.href = 'index.html';
}

// Login Page Logic
if (document.getElementById('login-btn')) {
    document.addEventListener('DOMContentLoaded', () => {
        const loginBtn = document.getElementById('login-btn');
        const adminBtn = document.getElementById('admin-btn');
        const usernameInput = document.getElementById('username');
        
        // Cek apakah user sudah login
        const currentUser = getCurrentUser();
        if (currentUser) {
            window.location.href = 'utama.html';
        }
        
        loginBtn.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            
            if (!username) {
                showNotification('Masukkan username terlebih dahulu', 'error');
                return;
            }
            
            if (username.length < 3) {
                showNotification('Username minimal 3 karakter', 'error');
                return;
            }
            
            loginBtn.innerHTML = '<div class="loading"></div>';
            loginBtn.disabled = true;
            
            try {
                // Simpan user ke localStorage
                setCurrentUser(username);
                
                // Cek atau buat data user di GitHub
                let usersData = await storage.readFile('data/users.json') || { users: [] };
                
                const existingUser = usersData.users.find(u => u.username === username);
                
                if (!existingUser) {
                    // Buat user baru
                    const newUser = {
                        id: Date.now(),
                        username: username,
                        created_at: new Date().toISOString()
                    };
                    
                    usersData.users.push(newUser);
                    await storage.writeFile('data/users.json', usersData, `User baru: ${username}`);
                }
                
                showNotification('Login berhasil!');
                setTimeout(() => {
                    window.location.href = 'utama.html';
                }, 1000);
                
            } catch (error) {
                console.error('Login error:', error);
                showNotification('Error saat login', 'error');
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
                loginBtn.disabled = false;
            }
        });
        
        adminBtn.addEventListener('click', () => {
            window.location.href = 'admin.html';
        });
        
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginBtn.click();
            }
        });
    });
}

// Admin Page Logic
if (document.getElementById('admin-password-modal')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const passwordModal = document.getElementById('admin-password-modal');
        const adminPasswordInput = document.getElementById('admin-password');
        const submitBtn = document.getElementById('submit-admin-password');
        const cancelBtn = document.getElementById('cancel-admin');
        const logoutBtn = document.getElementById('logout-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        
        // Cek apakah sudah login sebagai admin
        if (localStorage.getItem('isAdmin') === 'true') {
            passwordModal.style.display = 'none';
            loadAdminData();
        } else {
            passwordModal.style.display = 'flex';
        }
        
        // Password admin (untuk demo, simpan di localStorage)
        const ADMIN_PASSWORD = 'admin123';
        
        submitBtn.addEventListener('click', () => {
            if (adminPasswordInput.value === ADMIN_PASSWORD) {
                localStorage.setItem('isAdmin', 'true');
                passwordModal.style.display = 'none';
                loadAdminData();
                showNotification('Berhasil login sebagai admin');
            } else {
                showNotification('Password salah!', 'error');
                adminPasswordInput.value = '';
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        });
        
        logoutBtn.addEventListener('click', () => {
            logout();
        });
        
        refreshBtn.addEventListener('click', () => {
            loadAdminData();
            showNotification('Data diperbarui');
        });
        
        async function loadAdminData() {
            try {
                // Load users data
                const usersData = await storage.readFile('data/users.json') || { users: [] };
                const photosData = await storage.readFile('data/photos.json') || { photos: [] };
                
                // Update stats
                document.getElementById('total-users').textContent = usersData.users.length;
                document.getElementById('total-photos').textContent = photosData.photos.length;
                
                // Update table
                const tableBody = document.getElementById('users-table-body');
                tableBody.innerHTML = '';
                
                if (usersData.users.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="4" class="empty-message">Belum ada user terdaftar</td>
                        </tr>
                    `;
                    return;
                }
                
                usersData.users.forEach((user, index) => {
                    const userPhotos = photosData.photos.filter(p => p.user_id === user.id);
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${user.username}</td>
                        <td>${userPhotos.length}</td>
                        <td>
                            <button class="btn-view" onclick="viewUserPhotos(${user.id})">
                                <i class="fas fa-eye"></i> Lihat
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
                
            } catch (error) {
                console.error('Error loading admin data:', error);
                showNotification('Error memuat data admin', 'error');
            }
        }
        
        window.viewUserPhotos = function(userId) {
            alert(`Fitur lihat detail user dengan ID: ${userId} akan dikembangkan lebih lanjut.`);
        };
    });
}

// Gallery Page Logic
if (document.getElementById('upload-btn')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        // Update UI
        document.getElementById('current-user').textContent = `Halo, ${currentUser}`;
        
        // Event listeners
        document.getElementById('logout-user-btn').addEventListener('click', logout);
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        
        document.getElementById('file-input').addEventListener('change', handleFileUpload);
        
        // Modal event listeners
        const modal = document.getElementById('image-modal');
        const modalImage = document.getElementById('modal-image');
        const closeModal = modal.querySelector('.close-modal');
        const downloadBtn = document.getElementById('download-btn');
        const deleteBtn = document.getElementById('delete-btn');
        
        let currentPhoto = null;
        
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        downloadBtn.addEventListener('click', () => {
            if (currentPhoto) {
                const link = document.createElement('a');
                link.href = currentPhoto.url;
                link.download = `foto-${currentPhoto.id}.jpg`;
                link.click();
                showNotification('Download dimulai');
            }
        });
        
        deleteBtn.addEventListener('click', async () => {
            if (currentPhoto && confirm('Apakah Anda yakin ingin menghapus foto ini?')) {
                try {
                    // Hapus dari photos.json
                    const photosData = await storage.readFile('data/photos.json') || { photos: [] };
                    const updatedPhotos = photosData.photos.filter(p => p.id !== currentPhoto.id);
                    photosData.photos = updatedPhotos;
                    
                    await storage.writeFile('data/photos.json', photosData, `Hapus foto ID: ${currentPhoto.id}`);
                    
                    // Hapus file dari uploads (jika implementasi lengkap)
                    // await storage.deleteFile(`uploads/${currentPhoto.filename}`);
                    
                    modal.style.display = 'none';
                    showNotification('Foto berhasil dihapus');
                    loadGalleryData();
                    
                } catch (error) {
                    console.error('Error deleting photo:', error);
                    showNotification('Error menghapus foto', 'error');
                }
            }
        });
        
        // Load data
        loadGalleryData();
        
        async function loadGalleryData() {
            try {
                const usersData = await storage.readFile('data/users.json') || { users: [] };
                const photosData = await storage.readFile('data/photos.json') || { photos: [] };
                
                // Temukan user ID
                const user = usersData.users.find(u => u.username === currentUser);
                if (!user) return;
                
                const userId = user.id;
                const userPhotos = photosData.photos.filter(p => p.user_id === userId);
                const allPhotos = photosData.photos;
                
                // Update stats
                document.getElementById('user-photos-count').textContent = userPhotos.length;
                document.getElementById('total-photos-count').textContent = allPhotos.length;
                
                // Update gallery
                const galleryGrid = document.getElementById('gallery-grid');
                
                if (userPhotos.length === 0) {
                    galleryGrid.innerHTML = `
                        <div class="empty-gallery">
                            <i class="fas fa-image"></i>
                            <p>Belum ada foto. Klik "Tambah Gambar" untuk mengunggah.</p>
                        </div>
                    `;
                    return;
                }
                
                galleryGrid.innerHTML = '';
                
                userPhotos.forEach(photo => {
                    const photoCard = document.createElement('div');
                    photoCard.className = 'image-card';
                    photoCard.innerHTML = `
                        <img src="${photo.url}" alt="Foto ${photo.id}" loading="lazy">
                        <div class="image-info">
                            <p>Diunggah: ${new Date(photo.uploaded_at).toLocaleDateString()}</p>
                        </div>
                    `;
                    
                    photoCard.addEventListener('click', () => {
                        currentPhoto = photo;
                        modalImage.src = photo.url;
                        modal.style.display = 'flex';
                    });
                    
                    galleryGrid.appendChild(photoCard);
                });
                
            } catch (error) {
                console.error('Error loading gallery:', error);
                showNotification('Error memuat galeri', 'error');
            }
        }
        
        async function handleFileUpload(e) {
            const files = e.target.files;
            if (!files.length) return;
            
            const uploadBtn = document.getElementById('upload-btn');
            const originalText = uploadBtn.innerHTML;
            
            uploadBtn.innerHTML = '<div class="loading"></div> Mengunggah...';
            uploadBtn.disabled = true;
            
            try {
                // Baca data yang ada
                const usersData = await storage.readFile('data/users.json') || { users: [] };
                const photosData = await storage.readFile('data/photos.json') || { photos: [] };
                
                const user = usersData.users.find(u => u.username === currentUser);
                if (!user) throw new Error('User tidak ditemukan');
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    
                    // Generate unique filename
                    const timestamp = Date.now();
                    const filename = `${user.username}_${timestamp}_${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
                    
                    // Upload image ke GitHub
                    showNotification(`Mengunggah foto ${i + 1}/${files.length}...`);
                    const uploadResult = await storage.uploadImage(filename, file);
                    
                    if (!uploadResult) {
                        throw new Error('Gagal mengunggah gambar');
                    }
                    
                    // Tambah ke photos.json
                    const newPhoto = {
                        id: Date.now() + i,
                        user_id: user.id,
                        filename: filename,
                        url: uploadResult.url,
                        size: file.size,
                        uploaded_at: new Date().toISOString()
                    };
                    
                    photosData.photos.push(newPhoto);
                }
                
                // Simpan photos.json
                await storage.writeFile('data/photos.json', photosData, `Tambah foto dari ${currentUser}`);
                
                showNotification('Foto berhasil diunggah!');
                loadGalleryData();
                
            } catch (error) {
                console.error('Upload error:', error);
                showNotification('Error mengunggah foto', 'error');
            } finally {
                uploadBtn.innerHTML = originalText;
                uploadBtn.disabled = false;
                document.getElementById('file-input').value = '';
            }
        }
    });
}
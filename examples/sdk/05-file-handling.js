require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Signal SDK - File Handling Example
 * 
 * This example demonstrates comprehensive file handling features:
 * - Sending local files
 * - Sending multiple files
 * - Downloading and sending images from URLs
 * - Handling different file types
 * - Managing temporary files
 * - File validation and error handling
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - Environment variables set
 */

const { SignalCli } = require('../../dist/SignalCli');

async function fileHandlingExample() {
    console.log('Signal SDK - File Handling Example');
    console.log('======================================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;
    const recipientNumber = process.env.SIGNAL_ADMIN_NUMBER;

    if (!phoneNumber || !recipientNumber) {
        console.error('ERROR: Missing required environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('   SIGNAL_RECIPIENT_NUMBER - Test recipient number');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        console.error('   SIGNAL_RECIPIENT_NUMBER="+33000000000"');
        process.exit(1);
    }

    // Initialize SDK
    const signal = new SignalCli(undefined, phoneNumber);

    // Track temporary files for cleanup
    const tempFiles = [];

    try {
        // Step 1: Connect
        console.log('1. 🔗 Connecting to signal-cli...');
        await signal.connect();
        console.log('   - Connected successfully!\n');

        // Step 2: Send local files
        console.log('2. 📎 Sending local files...');

        // Check for common files to send
        const commonFiles = ['package.json', 'README.md', 'tsconfig.json'];
        const availableFiles = commonFiles.filter(file => fs.existsSync(file));

        if (availableFiles.length > 0) {
            console.log(`   - Found ${availableFiles.length} files to send:`);
            availableFiles.forEach(file => {
                const stats = fs.statSync(file);
                const sizeKB = (stats.size / 1024).toFixed(2);
                console.log(`     - ${file} (${sizeKB} KB)`);
            });

            // Send first file
            const firstFile = availableFiles[0];
            console.log(`\n   Sending ${firstFile}...`);
            await signal.sendMessage(recipientNumber, `Here is ${firstFile}:`, {
                attachments: [firstFile]
            });
            console.log(`   - ${firstFile} sent successfully!`);

            // Send multiple files if available
            if (availableFiles.length > 1) {
                console.log(`\n   Sending multiple files...`);
                const filesToSend = availableFiles.slice(0, 3); // Send max 3 files
                await signal.sendMessage(recipientNumber, `Multiple files package:`, {
                    attachments: filesToSend
                });
                console.log(`   - ${filesToSend.length} files sent successfully!`);
            }
        } else {
            console.log('   INFO: No common files found to send');
        }
        console.log();

        // Step 3: Create and send a temporary text file
        console.log('3. Creating and sending temporary text file...');
        const tempTextFile = path.join(process.cwd(), 'temp-signal-test.txt');
        const fileContent = `Signal SDK File Handling Test
=====================================

This is a temporary file created by the Signal SDK File Handling example.

Test Information:
- Created: ${new Date().toISOString()}
- Sender: ${phoneNumber}
- Recipient: ${recipientNumber}
- SDK Version: Latest

File Details:
- Format: UTF-8 Text
- Purpose: Testing file attachments
- Status: Temporary (will be deleted)

This file demonstrates the SDK's ability to create and send temporary files.

Features tested:
- File creation
- File attachment
- Message with file
- Temporary file cleanup
`;

        fs.writeFileSync(tempTextFile, fileContent);
        tempFiles.push(tempTextFile);

        await signal.sendMessage(recipientNumber, 'Temporary text file created and sent!', {
            attachments: [tempTextFile]
        });
        console.log('   - Temporary text file sent successfully!\n');

        // Step 4: Download and send an image from URL
        console.log('4. Downloading and sending image from URL...');

        // Helper function to download image
        const downloadImage = (url, filename) => {
            return new Promise((resolve, reject) => {
                const file = fs.createWriteStream(filename);
                const protocol = url.startsWith('https:') ? https : http;

                protocol.get(url, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                        return;
                    }

                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', reject);
            });
        };

        // Test image URLs
        const imageUrls = [
            'https://httpbin.org/image/png',
            'https://httpbin.org/image/jpeg',
            'https://via.placeholder.com/400x300.png?text=Signal+SDK+Test'
        ];

        for (const [index, imageUrl] of imageUrls.entries()) {
            try {
                const imageExtension = imageUrl.includes('.png') ? 'png' : 'jpg';
                const tempImageFile = path.join(process.cwd(), `temp-image-${index + 1}.${imageExtension}`);

                console.log(`   Downloading image ${index + 1}...`);
                await downloadImage(imageUrl, tempImageFile);
                tempFiles.push(tempImageFile);

                const imageStats = fs.statSync(tempImageFile);
                const imageSizeKB = (imageStats.size / 1024).toFixed(2);

                console.log(`   - Image downloaded (${imageSizeKB} KB)`);

                await signal.sendMessage(recipientNumber, `Image ${index + 1} downloaded from URL:`, {
                    attachments: [tempImageFile]
                });
                console.log(`   - Image ${index + 1} sent successfully!`);

                // Small delay between images
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.log(`   WARNING: Could not download/send image ${index + 1}: ${error.message}`);
            }
        }
        console.log();

        // Step 5: Create and send a JSON data file
        console.log('5. Creating and sending JSON data file...');
        const jsonData = {
            test: 'Signal SDK File Handling',
            timestamp: new Date().toISOString(),
            sender: phoneNumber,
            recipient: recipientNumber,
            features: [
                'Local file sending',
                'Multiple file attachments',
                'Temporary file creation',
                'Image downloading',
                'JSON data handling'
            ],
            stats: {
                filesCreated: tempFiles.length,
                totalSize: tempFiles.reduce((total, file) => {
                    try {
                        return total + fs.statSync(file).size;
                    } catch {
                        return total;
                    }
                }, 0)
            }
        };

        const tempJsonFile = path.join(process.cwd(), 'temp-signal-data.json');
        fs.writeFileSync(tempJsonFile, JSON.stringify(jsonData, null, 2));
        tempFiles.push(tempJsonFile);

        await signal.sendMessage(recipientNumber, 'JSON data file with test information:', {
            attachments: [tempJsonFile]
        });
        console.log('   - JSON data file sent successfully!\n');

        // Step 6: File validation and error handling
        console.log('6. Testing file validation and error handling...');

        // Test with non-existent file
        try {
            await signal.sendMessage(recipientNumber, 'This should fail:', {
                attachments: ['non-existent-file.txt']
            });
        } catch (error) {
            console.log('   - Non-existent file error handled correctly');
            console.log(`      - Error: ${error.message}`);
        }

        // Test with empty file
        const emptyFile = path.join(process.cwd(), 'temp-empty-file.txt');
        fs.writeFileSync(emptyFile, '');
        tempFiles.push(emptyFile);

        try {
            await signal.sendMessage(recipientNumber, 'Empty file test:', {
                attachments: [emptyFile]
            });
            console.log('   - Empty file sent successfully');
        } catch (error) {
            console.log('   - Empty file error:', error.message);
        }
        console.log();

        // Step 7: Send summary with all file information
        console.log('7. Sending file handling summary...');

        const tempFilesSummary = tempFiles.map(file => {
            try {
                const stats = fs.statSync(file);
                const sizeKB = (stats.size / 1024).toFixed(2);
                return `• ${path.basename(file)} (${sizeKB} KB)`;
            } catch {
                return `• ${path.basename(file)} (File not found)`;
            }
        }).join('\n');

        const summary = `File Handling Example Complete!\n\n` +
            `Files Processed:\n` +
            `- Local files: ${availableFiles.length}\n` +
            `- Temporary files: ${tempFiles.length}\n` +
            `- Images downloaded: ${imageUrls.length}\n` +
            `- JSON data files: 1\n\n` +
            `Temporary Files Created:\n${tempFilesSummary}\n\n` +
            `All file operations completed successfully!\n\n` +
            `Features Demonstrated:\n` +
            `- Local file attachments\n` +
            `- Multiple file sending\n` +
            `- Image downloading and sending\n` +
            `- Temporary file creation\n` +
            `- JSON data handling\n` +
            `- Error handling and validation\n\n` +
            `TIP: All temporary files will be cleaned up automatically.`;

        await signal.sendMessage(recipientNumber, summary);
        console.log('   - File handling summary sent!\n');

        console.log('File handling example completed successfully!');
        console.log(`- Created ${tempFiles.length} temporary files for testing`);
        console.log('- All files will be cleaned up automatically');

    } catch (error) {
        console.error('ERROR: Error occurred:', error.message);
        console.error('\nTIP: Troubleshooting:');
        console.error('   - Check file permissions');
        console.error('   - Verify internet connection for downloads');
        console.error('   - Ensure sufficient disk space');
        console.error('   - Check signal-cli file size limits');
        process.exit(1);
    } finally {
        // Clean up temporary files
        console.log('Cleaning up temporary files...');
        let cleanedFiles = 0;

        for (const file of tempFiles) {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                    cleanedFiles++;
                    console.log(`   - Deleted: ${path.basename(file)}`);
                }
            } catch (error) {
                console.log(`   - Could not delete: ${path.basename(file)}`);
            }
        }

        console.log(`   - Cleaned up ${cleanedFiles} temporary files`);
        // Clean shutdown
        console.log('Disconnecting from signal-cli...');
        await signal.gracefulShutdown();
        console.log('Disconnected successfully!');
    }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Run the example
fileHandlingExample().catch(error => {
    console.error('ERROR: Fatal error:', error);
    process.exit(1);
}); 
require('dotenv').config();

/**
 * Signal SDK - Device Management Example
 * 
 * This example demonstrates device management features introduced in signal-cli v0.13.23:
 * - Listing linked devices
 * - Updating device names
 * - Managing multiple devices
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - At least one linked device (optional, for full demo)
 * - Environment variables set
 */

const { SignalCli } = require('../../dist/SignalCli');

async function deviceManagementExample() {
    console.log('Signal SDK - Device Management Example');
    console.log('=========================================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;

    if (!phoneNumber) {
        console.error('ERROR: Missing required environment variable:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        process.exit(1);
    }

    // Initialize SDK
    const signal = new SignalCli(phoneNumber);

    try {
        // Step 1: Connect
        console.log('1. Connecting to signal-cli...');
        await signal.connect();
        console.log('   Connected successfully!\n');

        // Step 2: List all linked devices
        console.log('2. Listing all linked devices...');
        const devices = await signal.listDevices();
        
        if (devices.length === 0) {
            console.log('   No linked devices found.');
            console.log('   This is normal if you only use the primary device.\n');
        } else {
            console.log(`   Found ${devices.length} device(s):\n`);
            devices.forEach((device, index) => {
                console.log(`   Device ${index + 1}:`);
                console.log(`   - ID: ${device.id}`);
                console.log(`   - Name: ${device.name || 'Unnamed'}`);
                if (device.created) {
                    console.log(`   - Created: ${new Date(device.created).toLocaleString()}`);
                }
                if (device.lastSeen) {
                    console.log(`   - Last Seen: ${new Date(device.lastSeen).toLocaleString()}`);
                }
                console.log();
            });
        }

        // Step 3: Update device name (if devices exist)
        if (devices.length > 1) {
            // Get the first non-primary device (device ID > 1)
            const linkedDevice = devices.find(d => d.id > 1);
            
            if (linkedDevice) {
                console.log('3. Updating device name...');
                console.log(`   Updating device ${linkedDevice.id}: "${linkedDevice.name}" → "Updated Device Name"`);
                
                try {
                    await signal.updateDevice({
                        deviceId: linkedDevice.id,
                        deviceName: 'Updated Device Name'
                    });
                    console.log('   ✓ Device name updated successfully!\n');
                    
                    // Verify the update
                    console.log('4. Verifying the update...');
                    const updatedDevices = await signal.listDevices();
                    const updatedDevice = updatedDevices.find(d => d.id === linkedDevice.id);
                    
                    if (updatedDevice) {
                        console.log(`   Current name: "${updatedDevice.name}"`);
                        console.log('   ✓ Update verified!\n');
                    }
                } catch (error) {
                    console.error(`   Error updating device: ${error.message}\n`);
                }
            }
        } else {
            console.log('3. Skipping device update (no linked devices found)\n');
            console.log('   To test this feature:');
            console.log('   1. Link Signal Desktop or Mobile app');
            console.log('   2. Run this example again\n');
        }

        // Step 5: Demonstrate device naming best practices
        console.log('5. Device Naming Best Practices:');
        console.log('   ✓ Use descriptive names: "Work Laptop", "Home Desktop"');
        console.log('   ✓ Include location: "Office PC", "Living Room Tablet"');
        console.log('   ✓ Add date if temporary: "Conference Device 2026"');
        console.log('   ✓ Keep names under 50 characters');
        console.log('   ✓ Update names when device role changes\n');

        // Step 6: Security tips
        console.log('6. Security Tips:');
        console.log('   ✓ Review linked devices regularly');
        console.log('   ✓ Remove devices you no longer use');
        console.log('   ✓ Use meaningful names to identify suspicious devices');
        console.log('   ✓ Check "Last Seen" dates for unusual activity\n');

        // Summary
        console.log('═══════════════════════════════════════');
        console.log('Device Management Example Summary:');
        console.log('═══════════════════════════════════════');
        console.log(`✓ Listed ${devices.length} device(s)`);
        if (devices.length > 1) {
            console.log('✓ Demonstrated device name update');
        } else {
            console.log('- No linked devices to update');
        }
        console.log('✓ Reviewed best practices');
        console.log('\nDevice management example completed successfully!');

    } catch (error) {
        console.error('\nERROR: An error occurred:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Ensure signal-cli is properly installed');
        console.error('2. Verify your phone number is registered');
        console.error('3. Check that signal-cli daemon is running');
        console.error('4. Make sure you have signal-cli v0.13.23 or newer');
        console.error('\nFor more help, see: https://github.com/AsamK/signal-cli/wiki');
        process.exit(1);
    } finally {
        // Cleanup
        signal.disconnect();
    }
}

// Run the example
if (require.main === module) {
    deviceManagementExample().catch(console.error);
}

module.exports = { deviceManagementExample };

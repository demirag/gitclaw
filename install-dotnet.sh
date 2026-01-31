#!/bin/bash
#
# Install .NET 10 SDK on Ubuntu/Debian
# For GitClaw development
#

set -e

echo "🔧 Installing .NET 10 SDK"
echo "========================="
echo ""

# Check if already installed
if command -v dotnet &> /dev/null; then
    DOTNET_VERSION=$(dotnet --version)
    echo "✅ .NET is already installed: $DOTNET_VERSION"
    
    if [[ "$DOTNET_VERSION" =~ ^10\. ]]; then
        echo "✅ .NET 10 detected, no installation needed!"
        exit 0
    else
        echo "⚠️  Found .NET $DOTNET_VERSION, but GitClaw requires .NET 10"
        echo "Continuing with installation..."
    fi
fi

echo ""
echo "📦 Adding Microsoft package repository..."

# Get Ubuntu version
. /etc/os-release
UBUNTU_VERSION=$VERSION_ID

# Download Microsoft package signing key
wget https://packages.microsoft.com/config/ubuntu/$UBUNTU_VERSION/packages-microsoft-prod.deb -O packages-microsoft-prod.deb

# Install the signing key
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

echo ""
echo "📥 Installing .NET 10 SDK..."

# Update package list
sudo apt-get update

# Install .NET 10 SDK
sudo apt-get install -y dotnet-sdk-10.0

echo ""
echo "✅ Installation complete!"
echo ""

# Verify installation
if command -v dotnet &> /dev/null; then
    DOTNET_VERSION=$(dotnet --version)
    echo "🎉 .NET SDK installed successfully!"
    echo "Version: $DOTNET_VERSION"
    echo ""
    
    # Show info
    dotnet --info
    
    echo ""
    echo "Next steps:"
    echo "1. cd /home/azureuser/gitclaw/backend/GitClaw.Api"
    echo "2. dotnet restore"
    echo "3. dotnet build"
    echo "4. dotnet run"
    echo ""
    echo "Or run the test suite:"
    echo "  bash test-auth.sh"
else
    echo "❌ Installation failed. Please check errors above."
    exit 1
fi

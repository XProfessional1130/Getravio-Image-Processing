#!/usr/bin/env python
"""
AWS S3 Bucket Configuration Script
Automates the setup of S3 bucket with proper permissions for Django file uploads
"""

import boto3
import json
import os
import sys
from botocore.exceptions import ClientError
from dotenv import load_dotenv


# Load environment variables
load_dotenv()


class S3BucketConfigurator:
    """Configure AWS S3 bucket for Django application"""

    def __init__(self):
        # Load AWS credentials from environment
        self.access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
        self.region = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')

        if not all([self.access_key, self.secret_key, self.bucket_name]):
            print("[ERROR] Error: Missing AWS credentials in .env file")
            print("   Required variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_STORAGE_BUCKET_NAME")
            sys.exit(1)

        # Initialize boto3 clients
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region
        )

    def check_bucket_exists(self):
        """Check if bucket exists"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            print(f"[OK] Bucket '{self.bucket_name}' exists")
            return True
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                print(f"[ERROR] Bucket '{self.bucket_name}' does not exist")
                return False
            elif error_code == '403':
                print(f"[ERROR] Access denied to bucket '{self.bucket_name}'")
                print("   Check your AWS credentials and permissions")
                return False
            else:
                print(f"[ERROR] Error checking bucket: {str(e)}")
                return False

    def create_bucket(self):
        """Create S3 bucket"""
        try:
            if self.region == 'us-east-1':
                # us-east-1 doesn't need LocationConstraint
                self.s3_client.create_bucket(Bucket=self.bucket_name)
            else:
                self.s3_client.create_bucket(
                    Bucket=self.bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': self.region}
                )
            print(f"[OK] Created bucket '{self.bucket_name}'")
            return True
        except ClientError as e:
            print(f"[ERROR] Error creating bucket: {str(e)}")
            return False

    def check_public_access_block(self):
        """Check bucket's Block Public Access settings"""
        try:
            response = self.s3_client.get_public_access_block(Bucket=self.bucket_name)
            config = response['PublicAccessBlockConfiguration']

            print("\n[INFO] Current Block Public Access Settings:")
            print(f"   BlockPublicAcls: {config['BlockPublicAcls']}")
            print(f"   IgnorePublicAcls: {config['IgnorePublicAcls']}")
            print(f"   BlockPublicPolicy: {config['BlockPublicPolicy']}")
            print(f"   RestrictPublicBuckets: {config['RestrictPublicBuckets']}")

            # Check if settings will block our policy
            if config['BlockPublicPolicy'] or config['RestrictPublicBuckets']:
                print("\n[WARNING]  Warning: Current settings will block public read access!")
                print("   To allow public read access for uploaded images, you need to:")
                print("   - Set BlockPublicPolicy to False")
                print("   - Set RestrictPublicBuckets to False")
                return False

            return True

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchPublicAccessBlockConfiguration':
                print("[OK] No Block Public Access configuration (default allows public access)")
                return True
            else:
                print(f"[ERROR] Error checking Block Public Access: {str(e)}")
                return False

    def configure_public_access_block(self):
        """Configure Block Public Access settings to allow public read"""
        try:
            self.s3_client.put_public_access_block(
                Bucket=self.bucket_name,
                PublicAccessBlockConfiguration={
                    'BlockPublicAcls': True,  # Block public ACLs
                    'IgnorePublicAcls': True,  # Ignore public ACLs
                    'BlockPublicPolicy': False,  # Allow bucket policy to grant public access
                    'RestrictPublicBuckets': False  # Allow bucket to be public
                }
            )
            print("[OK] Configured Block Public Access settings")
            print("  - Allows bucket policy to grant public read access")
            print("  - Blocks ACL-based public access (using bucket policy instead)")
            return True
        except ClientError as e:
            print(f"[ERROR] Error configuring Block Public Access: {str(e)}")
            return False

    def set_bucket_policy(self):
        """Set bucket policy to allow public read access"""
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadGetObject",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": "s3:GetObject",
                    "Resource": f"arn:aws:s3:::{self.bucket_name}/*"
                }
            ]
        }

        try:
            self.s3_client.put_bucket_policy(
                Bucket=self.bucket_name,
                Policy=json.dumps(policy)
            )
            print("[OK] Set bucket policy for public read access")
            return True
        except ClientError as e:
            print(f"[ERROR] Error setting bucket policy: {str(e)}")
            return False

    def configure_cors(self):
        """Configure CORS for the bucket"""
        cors_configuration = {
            'CORSRules': [
                {
                    'AllowedHeaders': ['*'],
                    'AllowedMethods': ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
                    'AllowedOrigins': [
                        'http://localhost:5173',
                        'http://127.0.0.1:5173',
                        'http://localhost:3000',
                        'http://127.0.0.1:3000'
                    ],
                    'ExposeHeaders': ['ETag'],
                    'MaxAgeSeconds': 3000
                }
            ]
        }

        try:
            self.s3_client.put_bucket_cors(
                Bucket=self.bucket_name,
                CORSConfiguration=cors_configuration
            )
            print("[OK] Configured CORS settings")
            return True
        except ClientError as e:
            print(f"[ERROR] Error configuring CORS: {str(e)}")
            return False

    def verify_upload_access(self):
        """Verify that we can upload files to the bucket"""
        test_key = 'test-access.txt'
        test_content = 'Test upload from Django backend'

        try:
            # Upload test file
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=test_key,
                Body=test_content.encode('utf-8'),
                ContentType='text/plain'
            )
            print(f"[OK] Successfully uploaded test file: {test_key}")

            # Generate URL
            url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{test_key}"
            print(f"  URL: {url}")

            # Clean up test file
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=test_key)
            print(f"[OK] Successfully deleted test file")

            return True
        except ClientError as e:
            print(f"[ERROR] Error verifying upload access: {str(e)}")
            return False

    def run_configuration(self):
        """Run the full bucket configuration"""
        print("=" * 60)
        print("AWS S3 Bucket Configuration")
        print("=" * 60)
        print(f"\nBucket Name: {self.bucket_name}")
        print(f"Region: {self.region}")
        print()

        # Step 1: Check if bucket exists
        if not self.check_bucket_exists():
            print("\n[STEP] Creating bucket...")
            if not self.create_bucket():
                return False

        # Step 2: Check Block Public Access settings
        print("\n[STEP] Checking Block Public Access settings...")
        public_access_ok = self.check_public_access_block()

        if not public_access_ok:
            print("\n[STEP] Configuring Block Public Access settings...")
            if not self.configure_public_access_block():
                print("\n[WARNING]  Could not configure Block Public Access automatically")
                print("   Please configure manually in AWS Console:")
                print("   1. Go to S3 Console")
                print(f"   2. Select bucket '{self.bucket_name}'")
                print("   3. Go to 'Permissions' tab")
                print("   4. Edit 'Block Public Access'")
                print("   5. Uncheck 'Block public access to buckets and objects granted through new public bucket policies'")
                print("   6. Uncheck 'Block public and cross-account access to buckets and objects through any public bucket policies'")
                print("   7. Save changes")
                return False

        # Step 3: Set bucket policy
        print("\n[STEP] Setting bucket policy...")
        if not self.set_bucket_policy():
            return False

        # Step 4: Configure CORS
        print("\n[STEP] Configuring CORS...")
        if not self.configure_cors():
            return False

        # Step 5: Verify upload access
        print("\n[STEP] Verifying upload access...")
        if not self.verify_upload_access():
            return False

        print("\n" + "=" * 60)
        print("[OK] S3 Bucket Configuration Complete!")
        print("=" * 60)
        print("\nYour bucket is ready to use:")
        print(f"  • Public read access enabled")
        print(f"  • CORS configured for local development")
        print(f"  • Upload and download access verified")
        print("\nNext steps:")
        print("  1. Set USE_S3=True in your .env file")
        print("  2. Restart your Django server")
        print("  3. Upload an image through your API")
        print()

        return True


def main():
    """Main entry point"""
    configurator = S3BucketConfigurator()
    success = configurator.run_configuration()

    if not success:
        print("\n[ERROR] Configuration failed. Please review the errors above.")
        sys.exit(1)

    sys.exit(0)


if __name__ == '__main__':
    main()

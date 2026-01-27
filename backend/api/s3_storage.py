"""
AWS S3 Storage Backend for Django
Comprehensive implementation using boto3 for file operations
"""

import os
import boto3
import mimetypes
from datetime import datetime, timedelta
from urllib.parse import urljoin
from django.core.files.storage import Storage
from django.core.files.base import File
from django.conf import settings
from botocore.exceptions import ClientError
import io


class S3Storage(Storage):
    """
    Custom storage backend for AWS S3 using boto3
    Handles file uploads, downloads, and URL generation
    """

    def __init__(self, **settings_dict):
        super().__init__()

        # AWS Configuration
        self.access_key = settings_dict.get('access_key') or settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings_dict.get('secret_key') or settings.AWS_SECRET_ACCESS_KEY
        self.bucket_name = settings_dict.get('bucket_name') or settings.AWS_STORAGE_BUCKET_NAME
        self.region_name = settings_dict.get('region_name') or settings.AWS_S3_REGION_NAME

        # Storage settings
        self.location = settings_dict.get('location', '')
        self.file_overwrite = settings_dict.get('file_overwrite', True)
        self.default_acl = settings_dict.get('default_acl', None)

        # URL settings
        self.custom_domain = settings_dict.get('custom_domain', None)
        self.url_protocol = settings_dict.get('url_protocol', 'https:')

        # Cache settings
        self.max_age = settings_dict.get('max_age', 86400)  # 24 hours default

        # Initialize boto3 S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region_name
        )

        # Initialize boto3 S3 resource (for easier object operations)
        self.s3_resource = boto3.resource(
            's3',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region_name
        )

        self.bucket = self.s3_resource.Bucket(self.bucket_name)

    def _get_s3_key(self, name):
        """
        Generate the full S3 key for a file
        Handles location prefix and Windows path separators
        """
        # Normalize Windows backslashes to forward slashes
        name = name.replace('\\', '/')

        # Remove leading slashes
        name = name.lstrip('/')

        # Add location prefix if specified
        if self.location:
            # Ensure location doesn't have trailing slash
            location = self.location.rstrip('/')
            return f'{location}/{name}'

        return name

    def _open(self, name, mode='rb'):
        """
        Open a file from S3
        """
        s3_key = self._get_s3_key(name)

        try:
            # Download file content
            file_obj = io.BytesIO()
            self.s3_client.download_fileobj(self.bucket_name, s3_key, file_obj)
            file_obj.seek(0)

            # Wrap in Django File object
            return File(file_obj, name=name)
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                raise FileNotFoundError(f"File not found in S3: {s3_key}")
            raise

    def _save(self, name, content):
        """
        Save a file to S3
        """
        s3_key = self._get_s3_key(name)

        # Get content type
        content_type, _ = mimetypes.guess_type(name)
        if content_type is None:
            content_type = 'application/octet-stream'

        # Prepare extra arguments
        extra_args = {
            'ContentType': content_type,
            'CacheControl': f'max-age={self.max_age}',
        }

        # Add ACL if specified
        if self.default_acl:
            extra_args['ACL'] = self.default_acl

        try:
            # Upload file to S3
            if hasattr(content, 'read'):
                # File-like object
                content.seek(0)
                self.s3_client.upload_fileobj(
                    content,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs=extra_args
                )
            else:
                # Bytes or string
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=content,
                    **extra_args
                )

            return name
        except ClientError as e:
            raise IOError(f"Error uploading file to S3: {str(e)}")

    def delete(self, name):
        """
        Delete a file from S3
        """
        s3_key = self._get_s3_key(name)

        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
        except ClientError as e:
            raise IOError(f"Error deleting file from S3: {str(e)}")

    def exists(self, name):
        """
        Check if a file exists in S3
        """
        s3_key = self._get_s3_key(name)

        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            raise

    def size(self, name):
        """
        Get the size of a file in S3
        """
        s3_key = self._get_s3_key(name)

        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response['ContentLength']
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                raise FileNotFoundError(f"File not found in S3: {s3_key}")
            raise

    def url(self, name, expire=None):
        """
        Generate URL for accessing the file

        Args:
            name: File name/path
            expire: Expiration time in seconds (for signed URLs)

        Returns:
            Public URL or signed URL
        """
        s3_key = self._get_s3_key(name)

        # If expiration is specified, generate a signed URL
        if expire:
            try:
                url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': self.bucket_name,
                        'Key': s3_key
                    },
                    ExpiresIn=expire
                )
                return url
            except ClientError as e:
                raise IOError(f"Error generating signed URL: {str(e)}")

        # Generate public URL
        if self.custom_domain:
            return f'{self.url_protocol}//{self.custom_domain}/{s3_key}'
        else:
            # Use AWS default URL format
            return f'https://{self.bucket_name}.s3.{self.region_name}.amazonaws.com/{s3_key}'

    def get_accessed_time(self, name):
        """
        Get last accessed time (not supported by S3, returns modified time)
        """
        return self.get_modified_time(name)

    def get_created_time(self, name):
        """
        Get created time (returns modified time as S3 doesn't track creation)
        """
        return self.get_modified_time(name)

    def get_modified_time(self, name):
        """
        Get last modified time of a file
        """
        s3_key = self._get_s3_key(name)

        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response['LastModified']
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                raise FileNotFoundError(f"File not found in S3: {s3_key}")
            raise

    def listdir(self, path):
        """
        List contents of a directory in S3

        Returns:
            Tuple of (directories, files)
        """
        s3_key = self._get_s3_key(path)
        if s3_key and not s3_key.endswith('/'):
            s3_key += '/'

        directories = []
        files = []

        try:
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(
                Bucket=self.bucket_name,
                Prefix=s3_key,
                Delimiter='/'
            )

            for page in pages:
                # Get directories (CommonPrefixes)
                for prefix in page.get('CommonPrefixes', []):
                    dir_name = prefix['Prefix'][len(s3_key):].rstrip('/')
                    if dir_name:
                        directories.append(dir_name)

                # Get files (Contents)
                for obj in page.get('Contents', []):
                    file_name = obj['Key'][len(s3_key):]
                    if file_name and not file_name.endswith('/'):
                        files.append(file_name)

            return directories, files
        except ClientError as e:
            raise IOError(f"Error listing directory in S3: {str(e)}")

    def get_available_name(self, name, max_length=None):
        """
        Get an available name for the file
        If file_overwrite is True, return the same name
        Otherwise, append a number to make it unique
        """
        if self.file_overwrite:
            return name

        return super().get_available_name(name, max_length)


class PublicMediaStorage(S3Storage):
    """
    Storage for public media files (like uploaded images)
    """
    def __init__(self):
        super().__init__(
            location='media',
            default_acl=None,  # Don't use ACLs, rely on bucket policy
        )


class StaticStorage(S3Storage):
    """
    Storage for static files (CSS, JS, etc.)
    """
    def __init__(self):
        super().__init__(
            location='static',
            default_acl=None,
        )

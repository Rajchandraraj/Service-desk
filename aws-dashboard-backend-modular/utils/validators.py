import re

def is_valid_bucket_name(name):
    # Simple AWS S3 bucket name validation
    pattern = r'^[a-z0-9.-]{3,63}$'
    return re.match(pattern, name) is not None
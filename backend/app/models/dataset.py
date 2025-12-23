from pydantic import BaseModel

class UploadURLRequest(BaseModel):
    filename: str
    content_type: str | None = None

class UploadURLResponse(BaseModel):
    dataset_id: str
    object_key: str
    upload_url: str

class NotifyUploadRequest(BaseModel):
    dataset_id: str
    object_key: str
    sheet: str | None = None

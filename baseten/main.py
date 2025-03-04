
import baseten
from baseten import route
from baseten.models import StableDiffusionPipeline
from baseten.training import PublicUrl, DreamboothConfig, FinetuningRun

from datetime import datetime
from supabase import create_client

SUPABASE_PREFIX_URL = ""  # Include trailing forward-slash
SUPABASE_KEY = ""
BASETEN_API_KEY = ""
SUPABASE_TABLE_NAME = "finetuningruns"
SUPABASE_BUCKET_NAME = "fine-tuning-bucket"
SUPABASE_OBJECT_URL = "{SUPABASE_PREFIX_URL}storage/v1/object/public/{SUPABASE_BUCKET_NAME}/"


@route(path="/clear_user_data", allowed_domains=["http://localhost:3000", "https://intelli-pic.vercel.app"], is_public=True)
def clear_user_data(request):
    login_user()
    user_id = request["body"].get("user_id")
    client = get_supabase_client()
    client.table(SUPABASE_TABLE_NAME).update({
        "run_id": None,
        "dataset": None
    }).eq("user_id", user_id).execute()
    return get_user_data(user_id)


@route(path="/user_data", allowed_domains=["http://localhost:3000", "https://intelli-pic.vercel.app"], is_public=True)
def user_data(request):
    login_user()
    user_id = request["query"].get("user_id")
    client = get_supabase_client()
    data = client.table(SUPABASE_TABLE_NAME).select(
        "*").eq("user_id", user_id).execute()
    if len(data.data) == 0:
        data = client.table(SUPABASE_TABLE_NAME).insert(
            {"user_id": user_id}).execute()
    user_data = data.data[0]
    user_data["run_data"] = {}
    if user_data["run_id"]:
        fr = FinetuningRun(user_data["run_id"])
        fr.refresh()
        user_data["run_data"]["status"] = fr.status
    return user_data


@route(path="/model_status", allowed_domains=["http://localhost:3000", "https://intelli-pic.vercel.app"], allowed_methods=["GET"], is_public=True)
def model_status(request):
    user_data = get_user_data(request["query"]["user_id"])
    run_id = user_data.get("run_id")
    if not run_id:
        return {"healthy": False, "model_id": None}
    run = FinetuningRun(id=run_id)
    run.refresh()
    model = run.deployed_model
    return {
        "healthy": model.status == "MODEL_READY" if model else False,
        "model_id": model.id if model else None
    }


@route(path="/fine_tune_model", allowed_domains=["http://localhost:3000", "https://intelli-pic.vercel.app"], allowed_methods=["POST"], is_public=True)
def fine_tune_model(request):
    login_user()
    # get request data and instatiate useful data
    request_body = request["body"]
    url = request_body.get("url")
    user_id = request_body.get("user_id")
    now = datetime.now()  # current date and time
    name_of_model = f'{user_id} training run {now.strftime("%m/%d/%Y, %H:%M:%S")}'
    # Unique Identifier for the object
    instance_prompt = request_body.get("prompt")
    instance_prompt = "photo of " + instance_prompt
    class_prompt = request_body.get("instance_type")  # Type of the object
    class_prompt = "a photo of a " + class_prompt
    dataset = PublicUrl(f'{SUPABASE_OBJECT_URL}{url}')
    # initiate training
    # DreamboothConfig Reference: https://docs.blueprint.baseten.co/reference/python/DreamboothConfig/
    config = DreamboothConfig(
        instance_prompt=instance_prompt,
        class_prompt=class_prompt,
        input_dataset=dataset,
        train_text_encoder=True,
        max_train_steps=850,
        pretrained_model_name_or_path="stabilityai/stable-diffusion-2-1"
    )
    run = FinetuningRun.create(
        trained_model_name=name_of_model,
        fine_tuning_config=config,
        auto_deploy=True
    )
    run_data = {"run_id": run.id}
    # update user's data
    update_user_data(user_id, run_data)

    # return response
    return run_data


@route(path="/call_model", is_public=True, allowed_domains=["http://localhost:3000", "https://intelli-pic.vercel.app"], allowed_methods=["POST"])
def call_model(request):
    login_user()
    # get request data
    request_body = request["body"]
    instance_prompt = request_body.get("instance_prompt")
    run_id = request_body.get("run_id")
    run = FinetuningRun(run_id)
    # call model
    model = StableDiffusionPipeline(model_id=run.deployed_model._model_id)
    # generate response
    image, url = model(instance_prompt)
    # return response
    return {
        "url": url
    }


def get_supabase_client():
    client = create_client(SUPABASE_PREFIX_URL, SUPABASE_KEY)
    return client


def get_user_data(user_id):
    client = get_supabase_client()
    data = client.table(SUPABASE_TABLE_NAME).select(
        "*").eq("user_id", user_id).execute()
    user_data = data.data[0]
    user_data["run_data"] = {}
    return user_data


def update_user_data(user_id, run_data):
    client = get_supabase_client()
    client.table(SUPABASE_TABLE_NAME).update(
        run_data).eq("user_id", user_id).execute()


def get_run(run_id):
    client = get_supabase_client()
    data = client.table(SUPABASE_TABLE_NAME).select(
        "*").eq("run_id", run_id).execute()
    return data.data


def login_user():
    baseten.login(BASETEN_API_KEY)

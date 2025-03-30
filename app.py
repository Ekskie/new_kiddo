import datetime
import base64
from flask import Flask, render_template, request, jsonify, session
from supabase import create_client
import os

app = Flask(__name__)

# Supabase Configuration
SUPABASE_URL = "https://ydoxecqsmrcdzohiwaxn.supabase.co"  # Your Supabase project URL
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkb3hlY3FzbXJjZHpvaGl3YXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMDYzNTEsImV4cCI6MjA1NTg4MjM1MX0.rl-PLrpiJ39YkcfQCHn2tlUGOuIkADbN06lfHFw37zM"  # Replace with your Supabase API key
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/')
def home():
    return render_template('index.html')
# ------------------ Login Routes ------------------
@app.route('/login', methods=['GET'])
def login_get():
    return render_template('login.html')

@app.route('/community_drawing', methods=['GET'])
def community_drawing():
    return render_template('community_drawing.html')
@app.route('/whosplaying', methods=['GET'])
def whosplaying():
    return render_template('whosplaying.html')

@app.route('/login', methods=['POST'])
def login_post():
    email = request.form.get("email")
    password = request.form.get("password")
    
    if not email or not password:
        return jsonify({"status": "error", "message": "Please fill out all fields."}), 400
    
    # Attempt to sign in with Supabase Auth
    result = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })
    print("Login result:", result)
    
    # Check if login was successful by verifying if 'user' exists
    if hasattr(result, "user") and result.user is not None:
        return jsonify({"status": "success", "message": "Login successful."})
    else:
        return jsonify({"status": "error", "message": "Invalid credentials or account not verified."}), 400
    
@app.route('/check_session', methods=['GET'])
def check_session():
    session = supabase.auth.get_session()
    # Check if a user exists on the session object
    if session and getattr(session, "user", None) is not None:
        # Convert the user object to a dictionary (if it's a Pydantic model)
        return jsonify({"session": {"user": session.user.model_dump()}})
    else:
        return jsonify({"session": None})

@app.route('/get_posts', methods=['GET'])
def get_posts():
    try:
        # Retrieve current session (make sure your session handling is set up correctly)
        session_obj = supabase.auth.get_session()
        if not session_obj or not session_obj.user:
            return jsonify({"status": "error", "message": "User not authenticated."}), 401

        current_email = session_obj.user.email

        # Call the RPC function with the current user's email as parameter
        response = supabase.rpc("get_drawings_with_like_count", {"p_user_email": current_email}).execute()
        posts = response.data if response.data else []
        return jsonify({"status": "success", "posts": posts})
    except Exception as e:
        print("Error fetching posts:", e)
        return jsonify({"status": "error", "message": "Unable to fetch posts"}), 500



@app.route('/term')
def term():
    return render_template('term.html')

@app.route('/privacyPolicy')
def privacyPolicy():
    return render_template('privacyPolicy.html')

@app.route('/community')
def community():
    session_obj = supabase.auth.get_session()
    if not session_obj or not session_obj.user:
        return jsonify({"status": "error", "message": "User not authenticated."}), 401

    current_email = session_obj.user.email
    return render_template('community.html', current_email=current_email)

@app.route('/register', methods=['GET'])
def register():
    return render_template('register.html')

@app.route('/register', methods=['POST'])
def register_user():
    try:
        fullname = request.form.get("fullname")
        email = request.form.get("email")
        password = request.form.get("password")
        confirmPassword = request.form.get("confirmPassword")
        
        if not fullname or not email or not password:
            return jsonify({"status": "error", "message": "Please fill out all fields."}), 400
        
        if password != confirmPassword:
            return jsonify({"status": "error", "message": "Passwords do not match."}), 400

        # Attempt to register the user with Supabase Auth
        result = supabase.auth.sign_up({
            "email": email,
            "password": password
        })

        print("Registration result:", result)

        # Check if the registration was successful by looking at the 'user' attribute
        if hasattr(result, "user") and result.user is not None:
            # Optionally, insert additional data into a profiles table here
            return jsonify({"status": "success", "message": "Registration successful! Please check your email for verification."})
        else:
            # If registration didn't succeed, provide a generic error message.
            return jsonify({"status": "error", "message": "Registration failed. Please try again."}), 400

    except Exception as e:
        print("Exception in register_user:", e)
        return jsonify({"status": "error", "message": "An unexpected error occurred."}), 500
    
@app.route('/signout', methods=['GET'])
def signout():
    try:
        # Attempt to sign out with Supabase Auth
        result = supabase.auth.sign_out()
        # If using Flask sessions, you might clear them here:
        # session.clear()
        return jsonify({"status": "success", "message": "Sign out successful."})
    except Exception as e:
        print("Sign out error:", e)
        return jsonify({"status": "error", "message": "Sign out failed."}), 500

@app.route('/like_post', methods=['POST'])
def like_post():
    try:
        data = request.get_json()
        drawing_id = data.get("drawing_id")
        
        # Retrieve the current Supabase session
        session_obj = supabase.auth.get_session()
        if not session_obj or not session_obj.user:
            return jsonify({"status": "error", "message": "User not authenticated."}), 401

        # Access the email directly from the session object
        user_email = session_obj.user.email
        
        if not drawing_id or not user_email:
            return jsonify({"status": "error", "message": "Missing drawing ID or user email."}), 400

        # Check if the user already liked this drawing
        like_resp = supabase.table("drawings_likes") \
            .select("*") \
            .eq("drawing_id", drawing_id) \
            .eq("user_email", user_email) \
            .execute()
        
        if like_resp.data:
            # If liked already, remove the like
            supabase.table("drawings_likes") \
                .delete() \
                .eq("drawing_id", drawing_id) \
                .eq("user_email", user_email) \
                .execute()
            liked = False
        else:
            # Otherwise, insert a new like record
            supabase.table("drawings_likes").insert({
                "drawing_id": drawing_id,
                "user_email": user_email,
                "liked_at": datetime.datetime.now(datetime.timezone.utc).isoformat()

            }).execute()
            liked = True

        # Get updated like count for the drawing
        count_resp = supabase.table("drawings_likes") \
            .select("id", count="exact") \
            .eq("drawing_id", drawing_id) \
            .execute()

        like_count = count_resp.count if hasattr(count_resp, 'count') and count_resp.count is not None else 0


        return jsonify({"status": "success", "likes": like_count, "liked": liked})
    except Exception as e:
        print("Error in like_post:", e)
        return jsonify({"status": "error", "message": "Failed to update like."}), 500


@app.route('/create_post', methods=['POST'])
def create_post():
    try:
        data = request.get_json()
        caption = data.get("caption", "")
        image_data = data.get("image")  # Base64-encoded image
        
        # Retrieve current Supabase session
        session_obj = supabase.auth.get_session()
        if not session_obj or not session_obj.user:
            return jsonify({"status": "error", "message": "User not authenticated."}), 401
        
        # Use user's email as username (adjust as needed)
        username = session_obj.user.email
        
        image_url = None
        if image_data:
            # Decode base64 image
            if "," in image_data:
                _, encoded = image_data.split(",", 1)
            else:
                encoded = image_data
            image_binary = base64.b64decode(encoded)
            file_name = f"post_{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}.png"
            
            # Upload image to Supabase Storage
            storage_response = supabase.storage.from_("drawings").upload(file_name, image_binary)
            
            # Print response for debugging
            print("Storage upload response:", storage_response)
            
            # Get image URL manually (assuming public bucket)
            image_url = f"{SUPABASE_URL}/storage/v1/object/public/drawings/{file_name}"
        
        # Insert post data into database
        created_at = datetime.datetime.utcnow().isoformat()
        insert_data = {
            "username": username,
            "caption": caption,
            "image_url": image_url,
            "created_at": created_at
        }
        print("Inserting post with data:", insert_data)
        
        insert_resp = supabase.table("drawings").insert(insert_data).execute()
        print("Insert response:", insert_resp)
        
        if "error" in insert_resp:
            print("Insert error:", insert_resp["error"])
            return jsonify({"status": "error", "message": "Failed to create post."}), 500
        
        return jsonify({"status": "success", "message": "Post created successfully."})
    except Exception as e:
        import traceback
        print("Error in create_post:", e)
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": "An unexpected error occurred."}), 500


@app.route('/forgotPassword', methods=['GET'])
def forgotPassword():
    email = request.form.get("email")
    supabase.auth.reset_password_for_email(email)

if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)

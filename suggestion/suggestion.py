import os
import pandas as pd
import numpy as np
import sys
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import datetime

# Set the path dynamically
base_dir = os.path.dirname(os.path.abspath(__file__))
csv_file_path = os.path.join(base_dir, 'appliance_power_consumption.csv')

# Load the dataset
df = pd.read_csv(csv_file_path)

# Date setup for calculating cost limit
today = datetime.date.today().strftime("%Y-%m-%d")
year_ago = (datetime.date.today() - datetime.timedelta(days=365)).strftime("%Y-%m-%d")

# Filtering last year's data
last_year_data = df[df['Date'].str.contains(year_ago[-5:])]

# Calculate cost limit
cost_limit = last_year_data['Daily Cost (INR)'].sum() / 5

# Create a binary column indicating whether the daily cost is within the limit
df['WithinLimit'] = df['Daily Cost (INR)'] <= cost_limit

# Prepare the data for the model
df = pd.get_dummies(df, columns=['Appliance'])
X = df.drop(columns=['Date', 'Daily Cost (INR)', 'WithinLimit'])
y = df['WithinLimit']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Data scaling
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# Model training
model = LogisticRegression()
model.fit(X_train, y_train)

# Prediction function with individual appliance consumption values as parameters
def predict_within_limit(appliance_data):
    total_cost = sum(appliance_data.values())
    
    appliance_data_df = pd.DataFrame([appliance_data])
    appliance_data_df['Total_Cost'] = total_cost

    # Transform the input data to match training data format
    appliance_data_df = pd.get_dummies(appliance_data_df)
    appliance_data_df = appliance_data_df.reindex(columns=X.columns, fill_value=0)
    appliance_data_df = scaler.transform(appliance_data_df)
    prediction = model.predict(appliance_data_df)

    # Return consumption details and prediction message
    if prediction[0]:
        return f"Your total daily bill is {total_cost:.2f} INR. Your power consumption is within the limit. Keep it up!"
    else:
        return f"Your total daily bill is {total_cost:.2f} INR. Your power consumption is above the limit. Consider reducing usage of high-power appliances or switching to energy-efficient models."

# Main execution when the script is called
if __name__ == "__main__":
    input_data = json.loads(sys.stdin.read())
    result = predict_within_limit(input_data)
    print(result)

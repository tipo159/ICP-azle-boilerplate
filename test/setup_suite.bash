# Executed before each test.
setup_suite() {
    # Starts the local canister execution environment in the background in a clean state.
    dfx start --background --clean

    # Register, build, and deploy a canister on the local canister execution environment
    dfx deploy

    # Confirm that the users exist.
    IDENTITIES=`dfx identity list`
    if [[ ${IDENTITIES} != *"user1"* ]]; then
        dfx identity new user1
    fi
    if [[ ${IDENTITIES} != *"user2"* ]]; then
        dfx identity new user2
    fi
    if [[ ${IDENTITIES} != *"user3"* ]]; then
        dfx identity new user3
    fi

    export DELAY=80
    export DATE=`date -Iseconds -v+${DELAY}S`
}
